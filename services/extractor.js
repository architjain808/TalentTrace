import axios from 'axios';
import { getSecureKey, loadSettings } from './storage';
import {
    EXTRACTION_SYSTEM_PROMPT,
    buildExtractionPrompt,
} from '../constants/prompts';

export async function extractWithAI(company, domain, searchSnippets) {
    const key = await getSecureKey('OPENROUTER_API_KEY');
    if (!key) throw new Error('OPENROUTER_API_KEY not configured');

    const settings = await loadSettings();
    const model = settings.openrouterModel || 'google/gemini-2.5-flash-lite';

    const prompt = buildExtractionPrompt(company, domain, searchSnippets);

    let res;
    try {
        res = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model,
                temperature: 0.1,
                max_tokens: 1200,
                messages: [
                    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        if (status === 429) {
            throw new Error('Rate limited. Please wait a moment and try again.');
        }
        if (status === 404) {
            throw new Error(
                `Model "${model}" not found. ${model.includes(':free') ? 'For free models: go to openrouter.ai/settings/privacy and enable both privacy toggles. ' : ''}Try a different model in Settings.`
            );
        }
        throw new Error(`AI error: ${msg}`);
    }

    const text = res.data.choices[0].message.content;
    try {
        let cleaned = text.replace(/```json|```/g, '').trim();
        // If JSON was truncated, try to salvage it
        if (!cleaned.endsWith('}')) {
            // Remove last incomplete object/entry
            const lastComplete = cleaned.lastIndexOf('},');
            if (lastComplete > 0) {
                cleaned = cleaned.substring(0, lastComplete + 1);
                // Close arrays and object
                if (!cleaned.includes(']}')) cleaned += ']}';
                else cleaned += '}';
            }
        }
        const raw = JSON.parse(cleaned);
        return {
            domain: raw.d || raw.domain || domain,
            patterns: raw.p || raw.patterns || ['firstname.lastname'],
            people: (raw.c || raw.people || []).slice(0, 5).map((c) => ({
                name: c.n || c.name || '',
                role: c.r || c.role || '',
                email: c.e || c.email || null,
                linkedin: c.l || c.linkedin || null,
                phone: c.ph || c.phone || null,
                confidence: c.cf || c.confidence || 'medium',
            })),
        };
    } catch {
        return { domain, patterns: ['firstname.lastname'], people: [] };
    }
}

// Common email patterns used by companies, ordered by popularity
const COMMON_PATTERNS = [
    'firstname.lastname',    // john.doe@company.com (most common)
    'firstname_lastname',    // john_doe@company.com
    'firstnamelastname',     // johndoe@company.com
    'flastname',             // jdoe@company.com
    'firstname',             // john@company.com
    'firstname.l',           // john.d@company.com
    'f.lastname',            // j.doe@company.com
    'lastname.firstname',    // doe.john@company.com
    'firstnamel',            // johnd@company.com
];

/**
 * Parse a person's name into first name and last name, handling multi-word names
 */
function parseName(fullName) {
    const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };

    // First name is always the first word
    const first = parts[0];
    // Last name is the LAST word (skip middle names, prefixes like "van", "de", etc.)
    const last = parts[parts.length - 1];

    return { first, last };
}

/**
 * Apply an email pattern template to a name
 */
function applyPattern(pattern, first, last, domain) {
    if (!first) return null;

    const email = pattern
        .replace('firstname', first)
        .replace('lastname', last)
        .replace(/\bflastname\b/, `${first[0]}${last}`)
        .replace(/\bfirstnamel\b/, `${first}${last ? last[0] : ''}`)
        .replace(/\bfirstname\.l\b/, `${first}.${last ? last[0] : ''}`)
        .replace(/\bf\.lastname\b/, `${first[0]}.${last}`)
        .replace(/\blastname\.firstname\b/, `${last}.${first}`)
        .replace(/\bfirstnamelastname\b/, `${first}${last}`);

    // Don't generate if it still contains template variables
    if (/firstname|lastname/.test(email)) return null;
    // Don't generate if last name was needed but missing
    if (!last && pattern.includes('last')) return null;

    return email.includes('@') ? email : `${email}@${domain}`;
}

export function generateEmailCandidates(extracted) {
    const { domain, patterns = [], people = [] } = extracted;

    // Merge AI-detected patterns with common ones, AI patterns first (higher priority)
    const allPatterns = [...new Set([...patterns, ...COMMON_PATTERNS])];

    return people.map((person) => {
        // If AI found an actual email in search results, trust it
        if (person.email && person.email !== 'null' && person.email !== null
            && !['null', 'email', 'undefined'].includes(person.email.toLowerCase())) {
            return {
                ...person,
                emailCandidates: [person.email],
                confidence: person.confidence || 'high',
            };
        }

        const { first, last } = parseName(person.name);

        if (!first) {
            return {
                ...person,
                email: null,
                emailCandidates: [],
                confidence: 'low',
            };
        }

        // Generate candidates from all patterns
        const candidates = allPatterns
            .map((p) => applyPattern(p, first, last, domain))
            .filter(Boolean);

        // Remove duplicates
        const unique = [...new Set(candidates)];

        return {
            ...person,
            email: unique[0] || `${first}@${domain}`,
            emailCandidates: unique,
            // If email was generated from patterns, confidence is medium at best
            confidence: person.confidence === 'high' ? 'medium' : (person.confidence || 'medium'),
        };
    });
}
