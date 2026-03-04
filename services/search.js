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

export async function searchHRContacts(company, domain) {
    const key = process.env.EXPO_PUBLIC_SERPER_API_KEY;
    if (!key) throw new Error('EXPO_PUBLIC_SERPER_API_KEY not configured in .env');

    // Two focused queries instead of one diluted one
    const [peopleRes, patternRes] = await Promise.all([
        // Query 1: Find actual HR people on LinkedIn
        axios.post(
            'https://google.serper.dev/search',
            {
                q: `${company} HR recruiter talent acquisition contact site:linkedin.com/in`,
                num: 10,
            },
            {
                headers: {
                    'X-API-KEY': key,
                    'Content-Type': 'application/json',
                },
            }
        ),
        // Query 2: Find the company's email pattern + phone numbers
        axios.post(
            'https://google.serper.dev/search',
            {
                q: `${company} ${domain} email contact phone number HR recruiter`,
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

    if (!snippets) throw new Error('No HR contacts found in search results.');
    return snippets;
}
