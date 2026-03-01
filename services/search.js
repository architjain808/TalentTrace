import axios from 'axios';
import { getSecureKey } from './storage';

export async function findCompanyDomain(company) {
    const key = await getSecureKey('SERPER_API_KEY');
    if (!key) throw new Error('SERPER_API_KEY not configured');

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
    const key = await getSecureKey('SERPER_API_KEY');
    if (!key) throw new Error('SERPER_API_KEY not configured');

    // Single comprehensive query instead of 3 separate ones (saves 2 API calls)
    const res = await axios.post(
        'https://google.serper.dev/search',
        {
            q: `${company} HR manager recruiter talent acquisition email contact linkedin phone`,
            num: 10,
        },
        {
            headers: {
                'X-API-KEY': key,
                'Content-Type': 'application/json',
            },
        }
    );

    const items = res.data.organic || [];
    // Include link URL so AI can extract LinkedIn profiles
    const snippets = items
        .map((item) => `${item.title}: ${item.snippet} [URL: ${item.link}]`)
        .join('\n');

    if (!snippets) throw new Error('No HR contacts found in search results.');
    return snippets;
}

