import axios from 'axios';
import { getSecureKey } from './storage';

export async function findCompanyDomain(company) {
    const key = process.env.EXPO_PUBLIC_SERPER_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_SERPER_API_KEY not configured in .env');

    const res = await axios.post(
        'https://google.serper.dev/search',
        { q: `${company} official website`, num: 3 },
        {
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json',
            },
        }
    );

    const url = res.data.organic?.[0]?.link || '';
    if (!url) throw new Error('No results found for this company. Try a different name.');

    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        throw new Error('Could not determine company domain.');
    }
}

export async function searchContacts(company, domain, targetRole = 'key contact') {
    const key = process.env.EXPO_PUBLIC_SERPER_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_SERPER_API_KEY not configured in .env');

    // Two focused queries — both parameterized by targetRole
    const [peopleRes, patternRes] = await Promise.all([
        // Query 1: Find people matching the target role on LinkedIn
        axios.post(
            'https://google.serper.dev/search',
            {
                q: `${company} ${targetRole} site:linkedin.com/in`,
                num: 10,
            },
            {
                headers: {
                    'X-API-KEY': key,
                    'Content-Type': 'application/json',
                },
            }
        ),
        // Query 2: Find email pattern + contact info for the target role
        axios.post(
            'https://google.serper.dev/search',
            {
                q: `${company} ${domain} ${targetRole} email contact`,
                num: 10,
            },
            {
                headers: {
                    'X-API-KEY': key,
                    'Content-Type': 'application/json',
                },
            }
        ),
    ]);

    const peopleItems = peopleRes.data.organic || [];
    const patternItems = patternRes.data.organic || [];

    // Deduplicate by URL
    const seen = new Set();
    const allItems = [];
    for (const item of [...peopleItems, ...patternItems]) {
        if (!seen.has(item.link)) {
            seen.add(item.link);
            allItems.push(item);
        }
    }

    // Include link URL so AI can extract LinkedIn profiles
    const snippets = allItems
        .map((item) => `${item.title}: ${item.snippet} [URL: ${item.link}]`)
        .join('\n');

    if (!snippets) throw new Error('No contacts found in search results.');
    return snippets;
}

// Keep old name as alias so nothing breaks if imported elsewhere
export const searchHRContacts = searchContacts;
