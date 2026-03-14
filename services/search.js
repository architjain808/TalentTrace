const SERPER_API_KEY = process.env.EXPO_PUBLIC_SERPER_API_KEY;

const DOMAIN_BLACKLIST = [
  'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
  'wikipedia.org', 'crunchbase.com', 'glassdoor.com', 'indeed.com',
  'zoominfo.com', 'bloomberg.com', 'reuters.com', 'yelp.com',
  'bbb.org', 'instagram.com', 'youtube.com', 'tiktok.com',
  'github.com', 'medium.com', 'reddit.com', 'quora.com',
  'trustpilot.com', 'g2.com', 'capterra.com', 'ambitionbox.com',
  'naukri.com', 'apollo.io', 'rocketreach.co', 'signalhire.com',
  'pinterest.com', 'britannica.com', 'forbes.com',
];

/**
 * Serper helper — used for all Google Search API calls.
 * NEVER put quotes or @ symbol in the query — Serper returns 400.
 */
async function serperSearch(query, num = 10) {
  if (!SERPER_API_KEY) throw new Error('EXPO_PUBLIC_SERPER_API_KEY not configured in .env');
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERPER_API_KEY,
      },
      body: JSON.stringify({ q: query, num }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`Serper ${response.status}: ${errText}`);
      return [];
    }

    const data = await response.json();
    return data.organic || [];
  } catch (error) {
    console.error('Serper error:', error.message);
    return [];
  }
}

/**
 * Find the company's domain from Google search results.
 * Iterates all results, skips blacklisted domains (LinkedIn, Wikipedia, etc.)
 */
export async function findCompanyDomain(company) {
  const results = await serperSearch(`${company} official website`, 3);

  for (const result of results) {
    try {
      const hostname = new URL(result.link).hostname.replace(/^www\./, '');
      const isBlacklisted = DOMAIN_BLACKLIST.some(b => hostname.includes(b));
      if (!isBlacklisted && hostname.includes('.')) {
        return hostname;
      }
    } catch (e) {
      continue; // Invalid URL, skip
    }
  }

  // Fallback: guess domain from company name, verify with MX
  const guess = company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  try {
    const mxRes = await fetch(`https://dns.google/resolve?name=${guess}&type=MX`);
    const mxData = await mxRes.json();
    if (mxData.Status === 0 && mxData.Answer?.length > 0) {
      return guess;
    }
  } catch (e) {}

  return null; // Could not determine domain
}

/**
 * Search for people at a company matching the target role.
 * Returns raw Serper results for AI processing.
 * NEVER use quotes or @ in query — Serper returns 400.
 */
export async function searchPeople(company, targetRole) {
  const results = await serperSearch(
    `${company} ${targetRole} site:linkedin.com/in`,
    10
  );
  return results;
}
