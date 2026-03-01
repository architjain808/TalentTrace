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
                max_tokens: 800,
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
            })),
        };
    } catch {
        return { domain, patterns: ['firstname.lastname'], people: [] };
    }
}

export function generateEmailCandidates(extracted) {
    const { domain, patterns = [], people = [] } = extracted;

    return people.map((person) => {
        if (person.email && person.email !== 'null' && person.email !== null) {
            return { ...person, emailCandidates: [person.email] };
        }

        const nameParts = person.name.toLowerCase().split(/\s+/);
        const first = nameParts[0] || '';
        const last = nameParts.slice(1).join('') || '';

        const candidates = patterns.map((p) => {
            const filled = p
                .replace('firstname', first)
                .replace('lastname', last)
                .replace(/\bf\b/, first[0] || '');
            // If pattern already contains @, use as-is; otherwise append @domain
            return filled.includes('@') ? filled : `${filled}@${domain}`;
        });

        return {
            ...person,
            email: candidates[0] || `${first}@${domain}`,
            emailCandidates: candidates,
        };
    });
}
