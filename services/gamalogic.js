import { Platform } from 'react-native';

const GAMALOGIC_API_KEY = process.env.EXPO_PUBLIC_GAMALOGIC_API_KEY;

/**
 * Call Gamalogic Email Discovery API.
 * - Native (Android/iOS): calls gamalogic.com directly (no CORS restriction).
 * - Web: calls /gamalogic API route proxy (avoids CORS).
 */
async function callGamalogic(firstName, lastName, domain) {
    if (Platform.OS === 'web') {
        // Route through Expo Router API proxy (server-side, no CORS)
        const params = new URLSearchParams({ firstname: firstName, lastname: lastName, domain });
        const response = await fetch(`/gamalogic?${params}`);
        return response.json();
    } else {
        // Native: direct call works fine without CORS
        if (!GAMALOGIC_API_KEY) throw new Error('EXPO_PUBLIC_GAMALOGIC_API_KEY not configured');
        const url = `https://gamalogic.com/email-discovery/?firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&domain=${encodeURIComponent(domain)}&apikey=${GAMALOGIC_API_KEY}&speed_rank=0`;
        const response = await fetch(url);
        return response.json();
    }
}

/**
 * Find a verified email for a person at a company.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} domain - e.g. "daffodilsw.com"
 * @returns {Object} { email, verified, error }
 */
export async function findVerifiedEmail(firstName, lastName, domain) {
    try {
        const data = await callGamalogic(firstName, lastName, domain);

        if (data.error) {
            console.warn('Gamalogic error:', data.error_message);
            return { email: null, verified: false, error: data.error_message };
        }

        if (data.email && data.certified === 'verified') {
            return { email: data.email, verified: true, error: null };
        }

        if (data.email) {
            return { email: data.email, verified: false, error: null };
        }

        return { email: null, verified: false, error: null };
    } catch (error) {
        console.error('Gamalogic call failed:', error.message);
        return { email: null, verified: false, error: error.message };
    }
}

/**
 * Check remaining Gamalogic credits.
 */
export async function checkGamalogicCredits() {
    try {
        let response;
        if (Platform.OS === 'web') {
            response = await fetch('/gamalogic/credits');
        } else {
            if (!GAMALOGIC_API_KEY) return 0;
            response = await fetch(`https://gamalogic.com/creditbalance/?apikey=${GAMALOGIC_API_KEY}`);
        }
        const data = await response.json();
        return data.credits || 0;
    } catch {
        return 0;
    }
}
