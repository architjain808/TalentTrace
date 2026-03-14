const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

/**
 * Parse search results to extract person names, roles, and LinkedIn URLs.
 * First extracts LinkedIn URLs via regex (100% accurate).
 * Then uses Gemini to extract names + roles from snippets.
 *
 * @param {Array} serperResults - Raw results from Serper
 * @param {string} company - Company name
 * @param {string} targetRole - Role being searched for
 * @param {string} selectedModel - OpenRouter model ID
 * @returns {Array} [{ name, role, linkedin, source }]
 */
export async function extractPeople(serperResults, company, targetRole, selectedModel) {
  if (!OPENROUTER_API_KEY) throw new Error('EXPO_PUBLIC_OPENROUTER_API_KEY not configured in .env');

  // === REGEX EXTRACTION (free, instant, no hallucination) ===

  // Extract LinkedIn URLs directly from search result links
  const linkedinProfiles = [];
  for (const result of serperResults) {
    if (result.link && result.link.includes('linkedin.com/in/')) {
      linkedinProfiles.push({
        url: result.link,
        title: result.title || '',
        snippet: result.snippet || '',
      });
    }
  }

  // Build snippets string for Gemini
  const snippets = serperResults
    .map(r => `${r.title || ''}: ${r.snippet || ''} [URL: ${r.link || ''}]`)
    .join('\n');

  if (!snippets.trim()) {
    return [];
  }

  // === GEMINI EXTRACTION (names + roles only) ===

  const systemPrompt = `You extract person names and job titles from LinkedIn search results.
You NEVER extract or generate email addresses — that is handled by other code.

RULES:
1. Only return a person if their full name appears in a snippet AND is associated with "${company}".
2. If a snippet shows "J. Smith" without a full first name, return "J. Smith" exactly — do NOT guess.
3. Each contact MUST have a "src" field: a short phrase (max 10 words) from the snippet proving this person exists. No source = do not include.
4. EMPTY IS CORRECT. Return {"c":[]} if no people found. Never fabricate.
5. Return VALID JSON only. No markdown code blocks, no explanation, just raw JSON.`;

  const userPrompt = `Company: ${company}
Target Role: ${targetRole}

=== SEARCH RESULTS ===
${snippets}
=== END ===

Find up to 5 people who work at "${company}" in or near the "${targetRole}" role.

Return ONLY this JSON structure (no markdown, no backticks):
{"c":[{"n":"Full Name","r":"Job Title","cf":"medium","src":"phrase from snippet"}]}

Return {"c":[]} if none found.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel || 'google/gemini-2.5-flash',
        temperature: 0.0,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const status = response.status;
      if (status === 429) throw new Error('Rate limited. Please wait a moment and try again.');
      if (status === 404) throw new Error(`Model "${selectedModel}" not found. Try a different model in Settings.`);
      throw new Error(`AI error ${status}: ${errText}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';

    // Strip markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Truncation recovery: find last complete object
      const lastBrace = text.lastIndexOf('},');
      if (lastBrace > 0) {
        try { parsed = JSON.parse(text.substring(0, lastBrace + 1) + ']}'); } catch (e2) {}
      }
    }

    if (!parsed) return [];

    const contacts = parsed.c || parsed.contacts || [];
    const snippetsLower = snippets.toLowerCase();

    // Validate each contact: src must exist in actual snippets
    const validContacts = contacts.filter(c => {
      const name = c.n || c.name;
      const src = c.src || c.source;
      if (!name || name.length < 2) return false;
      if (!src || src.length < 5) return false;
      const phrase = src.trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      return snippetsLower.includes(phrase);
    });

    // Merge with LinkedIn URLs
    return validContacts.map(c => {
      const name = c.n || c.name;
      const role = c.r || c.role;
      const nameParts = name.toLowerCase().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts[nameParts.length - 1] || '';

      // Match to LinkedIn profile
      let linkedin = null;

      // Strategy 1: LinkedIn title contains both name parts
      const liMatch = linkedinProfiles.find(li => {
        const t = li.title.toLowerCase();
        return t.includes(firstName) && t.includes(lastName);
      });
      if (liMatch) {
        linkedin = liMatch.url;
      } else {
        // Strategy 2: LinkedIn URL slug contains name
        const slugMatch = linkedinProfiles.find(li => {
          const slug = (li.url.split('/in/')[1] || '').toLowerCase().replace(/[-_]/g, '');
          return slug.includes(firstName) || (lastName.length > 3 && slug.includes(lastName));
        });
        if (slugMatch) linkedin = slugMatch.url;
      }

      return {
        name,
        role,
        linkedin,
        source: c.src || c.source,
      };
    });
  } catch (error) {
    console.error('AI extraction error:', error.message);
    throw error;
  }
}

/**
 * Parse a full name into first and last name.
 * Handles titles (Dr, Mr), suffixes (Jr, PhD), diacritics (José → jose).
 */
export function parseName(fullName) {
  if (!fullName) return null;
  let parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const PREFIXES = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sir', 'eng'];
  const SUFFIXES = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'phd', 'md', 'esq', 'mba'];

  if (PREFIXES.includes(parts[0].toLowerCase().replace('.', ''))) parts.shift();
  if (parts.length > 1 && SUFFIXES.includes(parts[parts.length - 1].toLowerCase().replace('.', ''))) parts.pop();
  if (parts.length < 2) return null;

  // Normalize: remove diacritics, lowercase
  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return {
    first: normalize(parts[0]),
    last: normalize(parts[parts.length - 1]),
    original: fullName,
  };
}
