import { useState, useCallback } from 'react';
import { findCompanyDomain, searchHRContacts } from '../services/search';
import { extractWithAI, generateEmailCandidates } from '../services/extractor';
import { validateContacts } from '../services/validator';

const STEPS = [
    'Finding company domain...',
    'Searching for HR contacts...',
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

            // Step 5: Validate emails (format, MX records, domain check)
            setCurrentStep(4);
            const validated = await validateContacts(candidates);

            // Sort: valid emails first, then by confidence (high > medium > low)
            const confidenceOrder = { high: 0, medium: 1, low: 2 };
            validated.sort((a, b) => {
                // Valid first
                if (a.validation?.valid !== b.validation?.valid) {
                    return a.validation?.valid ? -1 : 1;
                }
                // Then by confidence
                const aConf = confidenceOrder[a.confidence] ?? 2;
                const bConf = confidenceOrder[b.confidence] ?? 2;
                return aConf - bConf;
            });

            // Done
            setCurrentStep(5);
            setResults(validated);

            if (validated.length === 0) {
                setError('No HR contacts found. Try a different company name.');
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
