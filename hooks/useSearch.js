import { useState, useCallback } from 'react';
import { findCompanyDomain, searchContacts } from '../services/search';
import { extractWithAI, generateEmailCandidates } from '../services/extractor';
import { validateContacts } from '../services/validator';
import { getUserRole } from '../services/storage';
import { auth as firebaseAuth } from '../firebase/config';
import { updateQuotaBalance, getUserProfile } from '../firebase/userCRUD';

const STEPS = [
    'Finding company domain...',
    'Searching for contacts...',
    'Extracting contacts with AI...',
    'Generating email candidates...',
    'Validating emails...',
    'Done!',
];

export function useSearch() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(-1);
    const [companyName, setCompanyName] = useState('');
    const [activeRole, setActiveRole] = useState(null); // role object used for last search

    const search = useCallback(async (company) => {
        setLoading(true);
        setError(null);
        setResults([]);
        setCompanyName(company);
        setCurrentStep(0);
        setActiveRole(null);

        try {
            if (!firebaseAuth.currentUser) {
                throw new Error('Please sign in to search for contacts.');
            }

            const profile = await getUserProfile(firebaseAuth.currentUser.uid);
            if (!profile) {
                throw new Error('User profile not found. Please try again.');
            } else if (profile.quotaBalance <= 0) {
                throw new Error('Insufficient Quota. Go to Settings and add quota to search for contacts.');
            }

            // Load user role to drive targeted search
            const role = await getUserRole();
            const targetRole = role?.searchTarget || 'key contact';
            setActiveRole(role);

            // Step 1: Get domain
            setCurrentStep(0);
            const domain = await findCompanyDomain(company);

            // Step 2: Search contacts (parameterized by role)
            setCurrentStep(1);
            const searchResults = await searchContacts(company, domain, targetRole);

            // Step 3: AI extraction
            setCurrentStep(2);
            const extracted = await extractWithAI(company, domain, searchResults, targetRole);

            // Step 4: Generate email candidates
            setCurrentStep(3);
            const candidates = generateEmailCandidates(extracted);

            // Step 5: Validate emails (format, MX records, domain check)
            setCurrentStep(4);
            const validated = await validateContacts(candidates);

            // Sort: valid emails first, then by confidence (high > medium > low)
            const confidenceOrder = { high: 0, medium: 1, low: 2 };
            validated.sort((a, b) => {
                if (a.validation?.valid !== b.validation?.valid) {
                    return a.validation?.valid ? -1 : 1;
                }
                const aConf = confidenceOrder[a.confidence] ?? 2;
                const bConf = confidenceOrder[b.confidence] ?? 2;
                return aConf - bConf;
            });

            // Deduct quota on successful search
            if (firebaseAuth.currentUser) {
                try {
                    await updateQuotaBalance(firebaseAuth.currentUser.uid, -1);
                } catch (e) {
                    console.error('Failed to deduct quota after search:', e);
                }
            }

            setCurrentStep(5);
            setResults(validated);

            if (validated.length === 0) {
                setError('No contacts found. Try a different company name or update your profile role in Settings.');
            }

            return validated;
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
