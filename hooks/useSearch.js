import { useState, useCallback } from 'react';
import { findCompanyDomain, searchPeople } from '../services/search';
import { extractPeople, parseName } from '../services/extractor';
import { findVerifiedEmail } from '../services/gamalogic';
import { checkCache, updateCache } from '../services/cache';
import { getRoleById, loadSettings } from '../services/storage';
import { auth as firebaseAuth } from '../firebase/config';
import { updateQuotaBalance, getUserProfile } from '../firebase/userCRUD';

const STEPS = [
    'Finding company domain...',
    'Searching for people...',
    'Extracting contacts with AI...',
    'Finding verified emails...',
    'Done!',
];

export function useSearch() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(-1);
    const [companyName, setCompanyName] = useState('');
    const [activeRole, setActiveRole] = useState(null);

    const search = useCallback(async (company) => {
        setLoading(true);
        setError(null);
        setResults([]);
        setCompanyName(company);
        setCurrentStep(0);
        setActiveRole(null);

        try {
            // PRE-FLIGHT (do not modify)
            if (!firebaseAuth.currentUser) {
                throw new Error('Please sign in to search for contacts.');
            }

            const profile = await getUserProfile(firebaseAuth.currentUser.uid);
            if (!profile) {
                throw new Error('User profile not found. Please try again.');
            } else if (profile.quotaBalance <= 0) {
                throw new Error('Insufficient Quota. Go to Settings and add quota to search for contacts.');
            }

            // Role resolution (do not modify)
            const role = profile.role ? getRoleById(profile.role) : null;
            const targetRole = role?.searchTarget || 'key contact';
            setActiveRole(role);

            const settings = await loadSettings();
            const selectedModel = settings.openrouterModel || 'google/gemini-2.5-flash';

            // Step 1: Find company domain
            setCurrentStep(0);
            const domain = await findCompanyDomain(company);
            if (!domain) {
                throw new Error('Could not find company website. Try a different company name.');
            }

            // Check cache — return early if fresh results exist
            const cache = await checkCache(domain);
            if (cache?.hasFreshContacts) {
                const cached = cache.contacts.map(c => ({
                    ...c,
                    fromCache: true,
                    score: c.verified ? 90 : 50,
                }));
                // Still deduct quota — user initiated a search
                if (firebaseAuth.currentUser) {
                    try { await updateQuotaBalance(firebaseAuth.currentUser.uid, -1); } catch (e) {
                        console.error('Failed to deduct quota after cache hit:', e);
                    }
                }
                setCurrentStep(4);
                setResults(cached);
                return cached;
            }

            // Step 2: Find people
            setCurrentStep(1);
            const serperResults = await searchPeople(company, targetRole);
            if (!serperResults || serperResults.length === 0) {
                throw new Error('No search results found. Try a different company name.');
            }

            // Step 3: Extract with AI (names + roles only)
            setCurrentStep(2);
            const people = await extractPeople(serperResults, company, targetRole, selectedModel);
            if (!people || people.length === 0) {
                throw new Error('No contacts found matching your role. Try a different company name or update your profile role in Settings.');
            }

            // Step 4: Find verified emails via Gamalogic for each person
            setCurrentStep(3);
            const finalResults = [];

            for (const person of people) {
                const parsed = parseName(person.name);
                if (!parsed) {
                    // Can't parse name — include without email
                    finalResults.push({
                        name: person.name,
                        role: person.role,
                        email: null,
                        linkedin: person.linkedin,
                        verified: false,
                        score: person.linkedin ? 40 : 20,
                        source: person.source,
                    });
                    continue;
                }

                // Call Gamalogic Email Finder via Cloud Function
                const emailResult = await findVerifiedEmail(parsed.first, parsed.last, domain);

                finalResults.push({
                    name: person.name,
                    role: person.role,
                    email: emailResult.email,
                    linkedin: person.linkedin,
                    verified: emailResult.verified,
                    score: calculateScore(emailResult, person),
                    source: person.source,
                });
            }

            // Sort by score descending
            finalResults.sort((a, b) => b.score - a.score);

            // Cache results (non-blocking)
            const toCache = finalResults.filter(r => r.email);
            updateCache(domain, company, toCache).catch(() => {});

            // Deduct quota on successful search (do not modify)
            if (firebaseAuth.currentUser) {
                try {
                    await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
                } catch (e) {
                    console.error('Failed to deduct quota after search:', e);
                }
            }

            setCurrentStep(4);
            setResults(finalResults);

            if (finalResults.length === 0) {
                setError('No contacts found. Try a different company name or update your profile role in Settings.');
            }

            return finalResults;
        } catch (err) {
            const message =
                err.response?.data?.message || err.message || 'An unexpected error occurred.';
            setError(message);
            setResults([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setResults([]);
        setError(null);
        setCurrentStep(-1);
        setCompanyName('');
        setActiveRole(null);
    }, []);

    return {
        results,
        loading,
        error,
        currentStep,
        steps: STEPS,
        companyName,
        activeRole,
        search,
        clearResults,
    };
}

function calculateScore(emailResult, person) {
    let score = 0;
    if (emailResult.email && emailResult.verified) score += 50;
    else if (emailResult.email) score += 25;
    if (person.linkedin) score += 25;
    if (person.source) score += 15;
    if (person.role) score += 10;
    return Math.min(score, 100);
}
