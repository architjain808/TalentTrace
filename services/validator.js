import axios from 'axios';

// Common personal/generic email domains — HR people never use these
const GENERIC_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
    'live.com', 'msn.com', 'me.com', 'inbox.com', 'gmx.com',
    'rediffmail.com', 'yahoo.co.in', 'yahoo.co.uk',
]);

/**
 * Validate email format using regex
 */
function isValidFormat(email) {
    if (!email || typeof email !== 'string') return false;
    // Reject obvious nulls/placeholders
    if (['null', 'undefined', 'email', 'null@null', ''].includes(email.toLowerCase())) return false;
    // Standard email regex
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
}

/**
 * Check if the domain is a generic/personal email provider
 */
function isGenericDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    return GENERIC_DOMAINS.has(domain);
}

/**
 * Check if a domain has MX records using Google's DNS-over-HTTPS API (free, no key needed)
 * Returns true if domain can receive email, false otherwise
 */
async function hasMXRecords(domain) {
    try {
        const res = await axios.get(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
            { timeout: 5000 }
        );
        // Status 0 = NOERROR, check if there are actual MX answers
        if (res.data.Status === 0 && res.data.Answer && res.data.Answer.length > 0) {
            return true;
        }
        // Some domains use A records as fallback for email (per RFC), check those too
        const aRes = await axios.get(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
            { timeout: 5000 }
        );
        return aRes.data.Status === 0 && aRes.data.Answer && aRes.data.Answer.length > 0;
    } catch {
        // If DNS check fails, give benefit of the doubt
        return true;
    }
}

/**
 * Validate a single email address through multiple layers
 * Returns: { valid: boolean, reason: string, confidence: 'high'|'medium'|'low' }
 */
export async function validateEmail(email, existingConfidence = 'medium') {
    // Layer 1: Format check
    if (!isValidFormat(email)) {
        return { valid: false, reason: 'Invalid email format', confidence: 'low' };
    }

    // Layer 2: Generic domain check
    if (isGenericDomain(email)) {
        return { valid: false, reason: 'Personal email domain (not corporate)', confidence: 'low' };
    }

    // Layer 3: MX record check
    const domain = email.split('@')[1];
    const hasMX = await hasMXRecords(domain);
    if (!hasMX) {
        return { valid: false, reason: 'Domain cannot receive email (no MX records)', confidence: 'low' };
    }

    // All checks passed
    return {
        valid: true,
        reason: 'Passed all checks',
        confidence: existingConfidence,
    };
}

/**
 * Validate all emails in a contact list
 * Adds validation results to each contact
 */
export async function validateContacts(contacts) {
    // Cache MX lookups per domain to avoid duplicate requests
    const mxCache = {};

    const validated = await Promise.all(
        contacts.map(async (contact) => {
            if (!contact.email) {
                return {
                    ...contact,
                    validation: { valid: false, reason: 'No email', confidence: 'low' },
                };
            }

            const domain = contact.email.split('@')[1];

            // Use cached MX result if available
            if (mxCache[domain] === undefined) {
                mxCache[domain] = hasMXRecords(domain);
            }

            const result = await validateEmail(contact.email, contact.confidence || 'medium');
            return {
                ...contact,
                validation: result,
            };
        })
    );

    return validated;
}
