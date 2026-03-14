const GAMALOGIC_API_KEY = process.env.EXPO_PUBLIC_GAMALOGIC_API_KEY;

/**
 * Find a verified email for a person at a company.
 * Calls Gamalogic Email Finder directly — works on Android/iOS native.
 * (CORS is a browser-only restriction; React Native bypasses it.)
 *
 * @param {string} firstName - Person's first name
 * @param {string} lastName - Person's last name
 * @param {string} domain - Company domain (e.g. "daffodilsw.com")
 * @returns {Object} { email, verified, error }
 */
export async function findVerifiedEmail(firstName, lastName, domain) {
  if (!GAMALOGIC_API_KEY) {
    console.warn('EXPO_PUBLIC_GAMALOGIC_API_KEY not set');
    return { email: null, verified: false, error: 'Gamalogic API key not configured' };
  }

  try {
    const url = `https://gamalogic.com/email-discovery/?firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&domain=${encodeURIComponent(domain)}&apikey=${GAMALOGIC_API_KEY}&speed_rank=0`;

    const response = await fetch(url);
    if (!response.ok) {
      return { email: null, verified: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

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
    console.error('Gamalogic fetch failed:', error.message);
    return { email: null, verified: false, error: error.message };
  }
}

/**
 * Check remaining Gamalogic credits.
 */
export async function checkGamalogicCredits() {
  if (!GAMALOGIC_API_KEY) return 0;
  try {
    const response = await fetch(`https://gamalogic.com/creditbalance/?apikey=${GAMALOGIC_API_KEY}`);
    const data = await response.json();
    return data.credits || 0;
  } catch (error) {
    return 0;
  }
}
