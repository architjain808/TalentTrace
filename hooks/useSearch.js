import { useState, useCallback } from 'react';
import { findCompanyDomain, searchHRContacts } from '../services/search';
import { extractWithAI, generateEmailCandidates } from '../services/extractor';

const STEPS = [
    'Finding company domain...',
    'Searching for HR contacts...',
    'Extracting contacts with AI...',
    'Generating email candidates...',
    'Done!',
];

export function useSearch() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentStep, setCurrentStep] = useState(-1);
    const [companyName, setCompanyName] = useState('');

    const search = useCallback(async (company) => {
        setLoading(true);
        setError(null);
        setResults([]);
        setCompanyName(company);
        setCurrentStep(0);

        try {
            // Step 1: Get domain
            setCurrentStep(0);
            const domain = await findCompanyDomain(company);

            // Step 2: Search HR contacts
            setCurrentStep(1);
            const searchResults = await searchHRContacts(company, domain);

            // Step 3: AI extraction
            setCurrentStep(2);
            const extracted = await extractWithAI(company, domain, searchResults);

            // Step 4: Generate email candidates
            setCurrentStep(3);
            const candidates = generateEmailCandidates(extracted);

            // Done
            setCurrentStep(4);
            setResults(candidates);

            if (candidates.length === 0) {
                setError('No HR contacts found. Try a different company name.');
            }

            return candidates;
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
    }, []);

    return {
        results,
        loading,
        error,
        currentStep,
        steps: STEPS,
        companyName,
        search,
        clearResults,
    };
}

