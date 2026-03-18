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
    const [results, setResults]           = useState([]);
    const [extraResults, setExtraResults] = useState([]); // cross-role cached contacts
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [currentStep, setCurrentStep]   = useState(-1);
    const [companyName, setCompanyName]   = useState('');
    const [activeRole, setActiveRole]     = useState(null);

    const search = useCallback(async (company) => {
        setLoading(true);
        setError(null);
        setResults([]);
        setExtraResults([]);
        setCompanyName(company);
        setCurrentStep(0);
        setActiveRole(null);

        try {
            // ── PRE-FLIGHT (do not modify) ────────────────────────────────────
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
            const role       = profile.role ? getRoleById(profile.role) : null;
            const targetRole = role?.searchTarget || 'key contact';
            setActiveRole(role);

            const settings      = await loadSettings();
            const selectedModel = settings.openrouterModel || 'google/gemini-2.5-flash';

            // ── STEP 1: Find company domain ───────────────────────────────────
            setCurrentStep(0);
            const domain = await findCompanyDomain(company);
            if (!domain) {
                throw new Error('Could not find company website. Try a different company name.');
            }

            // ── CACHE CHECK ───────────────────────────────────────────────────
            const cacheResult = await checkCache(domain, targetRole);

            if (cacheResult.tier === 'exact') {
                // Tier 1 — same role, fresh data: return immediately
                const cached = cacheResult.exactContacts.map(c => ({
                    ...c,
                    fromCache:  true,
                    cacheType:  'exact',
                    score:      c.verified ? 90 : 50,
                }));

                try {
                    await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
                } catch (e) {
                    console.error('Quota deduct failed (exact cache hit):', e);
                }

                setCurrentStep(4);
                setResults(cached);
                setExtraResults([]);
                return cached;
            }

            // Tier 2 — collect cross-role contacts to show as secondary section
            // They will be deduplicated against fresh results after the pipeline runs.
            const crossRoleItems = cacheResult.tier === 'cross'
                ? cacheResult.crossRoleContacts.map(c => ({
                    ...c,
                    fromCache: true,
                    cacheType: 'cross',
                    score:     c.verified ? 45 : 25,
                }))
                : [];

            // ── STEP 2: Find people at the company ───────────────────────────
            setCurrentStep(1);
            const serperResults = await searchPeople(company, targetRole);
            if (!serperResults || serperResults.length === 0) {
                // No live results — fall back to cross-role contacts if available
                if (crossRoleItems.length > 0) {
                    try {
                        await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
                    } catch (e) {
                        console.error('Quota deduct failed (cross-role fallback):', e);
                    }
                    setCurrentStep(4);
                    setResults([]);
                    setExtraResults(crossRoleItems);
                    return [];
                }
                throw new Error('No search results found. Try a different company name.');
            }

            // ── STEP 3: Extract with AI ──────────────────────────────────────
            setCurrentStep(2);
            const people = await extractPeople(serperResults, company, targetRole, selectedModel);
            if (!people || people.length === 0) {
                // No people found — fall back to cross-role contacts if available
                if (crossRoleItems.length > 0) {
                    try {
                        await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
                    } catch (e) {
                        console.error('Quota deduct failed (cross-role fallback):', e);
                    }
                    setCurrentStep(4);
                    setResults([]);
                    setExtraResults(crossRoleItems);
                    return [];
                }
                throw new Error('No contacts found matching your role. Try a different company name or update your profile role in Settings.');
            }

            // ── STEP 4: Find verified emails via Gamalogic ───────────────────
            setCurrentStep(3);
            const finalResults = [];

            for (const person of people) {
                const parsed = parseName(person.name);
                if (!parsed) {
                    finalResults.push({
                        name:     person.name,
                        role:     person.role,
                        email:    null,
                        linkedin: person.linkedin,
                        verified: false,
                        score:    person.linkedin ? 40 : 20,
                        source:   person.source,
                    });
                    continue;
                }

                const emailResult = await findVerifiedEmail(parsed.first, parsed.last, domain);

                finalResults.push({
                    name:     person.name,
                    role:     person.role,
                    email:    emailResult.email,
                    linkedin: person.linkedin,
                    verified: emailResult.verified,
                    score:    calculateScore(emailResult, person),
                    source:   person.source,
                });
            }

            // Sort primary results by score descending
            finalResults.sort((a, b) => b.score - a.score);

            // ── Deduplicate cross-role contacts against fresh results ─────────
            // Remove any cross-role contact whose email or name already appears
            // in the fresh results (same person found by both pipelines).
            const seen = new Set();
            for (const c of finalResults) {
                if (c.email) seen.add(c.email.toLowerCase());
                if (c.name)  seen.add(c.name.toLowerCase());
            }
            const dedupedCrossRole = crossRoleItems.filter(c => {
                const eKey = c.email?.toLowerCase();
                const nKey = c.name?.toLowerCase();
                if (eKey && seen.has(eKey)) return false;
                if (nKey && seen.has(nKey)) return false;
                return true;
            });

            // ── Cache fresh results under current role (non-blocking) ─────────
            // Only cache contacts that have a verified/found email — no point
            // storing contacts without emails as they add no value on cache hit.
            const toCache = finalResults.filter(r => r.email);
            if (toCache.length > 0) {
                updateCache(domain, company, toCache, targetRole).catch(() => {});
            }

            // ── Deduct quota ─────────────────────────────────────────────────
            try {
                await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
            } catch (e) {
                console.error('Quota deduct failed:', e);
            }

            setCurrentStep(4);
            setResults(finalResults);
            setExtraResults(dedupedCrossRole);

            // Only show "no contacts" error when BOTH sections are empty
            if (finalResults.length === 0 && dedupedCrossRole.length === 0) {
                setError('No contacts found. Try a different company name or update your profile role in Settings.');
            }

            return finalResults;

        } catch (err) {
            const message =
                err.response?.data?.message || err.message || 'An unexpected error occurred.';
            setError(message);
            setResults([]);
            setExtraResults([]);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setResults([]);
        setExtraResults([]);
        setError(null);
        setCurrentStep(-1);
        setCompanyName('');
        setActiveRole(null);
    }, []);

    return {
        results,
        extraResults,
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
    if (person.source)   score += 15;
    if (person.role)     score += 10;
    return Math.min(score, 100);
}
