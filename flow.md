# TalentTrace — Simplified Email Discovery Flow (FINAL)

## FOR CLAUDE CODE: Read this ENTIRE document before writing ANY code.

---

## WHAT THIS APP DOES

TalentTrace finds professional email addresses for B2B contacts. A user types a company name (e.g. "Daffodil Software"), and the app finds employees matching a target role (CTO, HR Manager, Sales Director — any role) and returns their verified email addresses and LinkedIn profiles.

The app is **role-agnostic**. The target role comes from the user's profile: `profile.role` → `getRoleById()` → `role.searchTarget`. Never hardcode any specific role.

---

## THE SIMPLIFIED PIPELINE

```
User Input: company name + targetRole (from profile)
    │
    ▼
[Pre-flight] Firebase auth + quota check + role resolution  (EXISTING — do not modify)
    │
    ▼
[Step 1] findCompanyDomain()       → Serper API call #1       → domain
    │
    ▼
[Step 2] findPeople()              → Serper API call #2       → names + roles + LinkedIn URLs
    │                              → Gemini via OpenRouter     → structured extraction
    │
    ▼
[Step 3] findEmails()              → Gamalogic Email Finder   → verified emails (via Cloud Function)
    │                                 (for each person found)
    │
    ▼
[Step 4] buildResults()           → Combine all data, score, sort
    │
    ▼
[Step 5] cacheResults()           → Firestore write (non-blocking)
    │
    ▼
Display results + deduct quota (-1)
```

**Total API calls per search:** 2× Serper + 1× Gemini + up to 5× Gamalogic (via Cloud Function)
**Total cost per search:** ~$0.009 (while free credits last)

---

## CRITICAL ARCHITECTURAL DECISION: CORS

**Gamalogic's API does NOT support CORS.** Calling `https://gamalogic.com/...` directly from a browser or Expo web app will fail with:
```
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:** ALL Gamalogic calls MUST go through a Firebase Cloud Function proxy. The client calls your Cloud Function → Cloud Function calls Gamalogic server-side → returns result to client. This is non-negotiable.

---

## WHAT MUST NOT BE MODIFIED

- Firebase Auth flow (sign-in check, `firebaseAuth.currentUser`)
- Quota system (`profile.quotaBalance`, `getUserProfile()`, -1 deduction after results)
- Role resolution (`profile.role` → `getRoleById()` → `role.searchTarget`)
- Settings page model selector (keep working, just change default model)
- Existing env vars (`EXPO_PUBLIC_SERPER_API_KEY`, `EXPO_PUBLIC_OPENROUTER_API_KEY`)

---

## COMPLETE API REFERENCE

### API 1: Serper (Google Search)

**Endpoint:** `POST https://google.serper.dev/search`

**Request:**
```
Headers:
  Content-Type: application/json
  X-API-Key: <EXPO_PUBLIC_SERPER_API_KEY>

Body (JSON):
{
  "q": "plain text query here",
  "num": 10
}
```

**CRITICAL — Serper query rules:**
- The `q` value must be a PLAIN STRING
- ❌ 400 ERROR: `"q": "\"@domain.com\" email"` — no quotes inside query
- ❌ 400 ERROR: `"q": "@domain.com email"` — the @ symbol can cause issues
- ✅ WORKS: `"q": "Daffodil Software official website"`
- ✅ WORKS: `"q": "Daffodil Software CTO site:linkedin.com/in"`
- The `site:` operator is fine. Quotes and `@` are NOT.

**Response:**
```json
{
  "organic": [
    {
      "title": "Page Title Here",
      "link": "https://example.com/page",
      "snippet": "A short description of the page content...",
      "position": 1
    }
  ]
}
```
Use `response.organic` — it's an array. Each item has `title`, `link`, `snippet`.

**Errors:** 400 = bad query (special chars), 401 = bad API key, 429 = rate limited.

**Cost:** ~$0.004 per call.

---

### API 2: OpenRouter (Gemini LLM)

**Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`

**Request:**
```
Headers:
  Content-Type: application/json
  Authorization: Bearer <EXPO_PUBLIC_OPENROUTER_API_KEY>

Body (JSON):
{
  "model": "google/gemini-2.5-flash",
  "temperature": 0.0,
  "max_tokens": 1200,
  "messages": [
    { "role": "system", "content": "system prompt" },
    { "role": "user", "content": "user prompt" }
  ]
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "the model's text response"
      }
    }
  ]
}
```
Extract: `response.choices[0].message.content`

**Note:** Keep model configurable via Settings page. Default changes from `gemini-2.5-flash-lite` to `gemini-2.5-flash`.

**Cost:** ~$0.0005 per call.

---

### API 3: Gamalogic Email Finder (MUST go through Cloud Function — NO direct client calls)

**Actual Gamalogic Endpoint (called by Cloud Function only, never by client):**

`GET https://gamalogic.com/email-discovery/`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `firstname` | string | Yes | First name of the person |
| `lastname` | string | Yes | Last name of the person |
| `domain` | string | Yes | Company domain (e.g. `daffodilsw.com`) |
| `apikey` | string | Yes | Your Gamalogic API key |
| `speed_rank` | int | No | 0 = fastest (default), 1-5 = slower but more thorough |

**Example URL (used by Cloud Function internally):**
```
https://gamalogic.com/email-discovery/?firstname=Yogesh&lastname=Agarwal&domain=daffodilsw.com&apikey=YOUR_KEY&speed_rank=0
```

**Success Response:**
```json
{
  "certified": "verified",
  "email": "yogesh.agarwal@daffodilsw.com",
  "error": false
}
```
- `error: false` + `certified: "verified"` + `email` exists = SUCCESS — email is real and verified
- `error: false` + `certified` is NOT "verified" = email found but unverified
- `error: false` + `email` is null/empty = no email could be found for this person

**Error Response:**
```json
{
  "error": true,
  "error_code": 102,
  "error_message": "Credits Exhausted please contact support@gamalogic.com"
}
```

**Error codes:**
| Code | Meaning |
|------|---------|
| 101 | Unauthorized (bad API key) |
| 102 | Credits exhausted |
| 103 | Internal error |
| 104 | No domain provided |
| 105 | No names provided |

**Credits:** 1 credit per email finder call. 500 free credits on signup. Check balance: `GET https://gamalogic.com/creditbalance/?apikey=YOUR_KEY`

**Rate limit:** Not explicitly documented, but reasonable usage (a few calls per second) is fine.

---

### API 4: Gamalogic Credit Balance (optional, for monitoring)

`GET https://gamalogic.com/creditbalance/?apikey=YOUR_KEY`

**Response:**
```json
{
  "credits": 487
}
```

---

### API 5: Google DNS (MX Record Check — FREE, no key needed)

`GET https://dns.google/resolve?name=<domain>&type=MX`

**Response:**
```json
{
  "Status": 0,
  "Answer": [
    { "name": "daffodilsw.com.", "type": 15, "data": "10 mail.daffodilsw.com." }
  ]
}
```
`Status: 0` + `Answer` array present = domain can receive email. Keep existing implementation.

---

## IMPLEMENTATION

### Part 1: Firebase Cloud Function (deploy FIRST, before any client changes)

**File:** `functions/index.js`

This proxy solves the CORS problem. The client calls this Cloud Function, the Cloud Function calls Gamalogic, returns the result.

```js
const functions = require('firebase-functions');
const https = require('https');

// Simple HTTPS GET that returns parsed JSON
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ error: true, error_message: 'Invalid JSON response', raw: data }); }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// === EMAIL FINDER — finds verified email from name + domain ===
exports.findEmail = functions.https.onCall(async (data, context) => {
  const { firstName, lastName, domain } = data;

  if (!firstName || !lastName || !domain) {
    return { error: true, error_message: 'Missing firstName, lastName, or domain' };
  }

  // Get API key from Firebase config or environment
  const apiKey = functions.config().gamalogic?.apikey || process.env.GAMALOGIC_API_KEY;
  if (!apiKey) {
    return { error: true, error_message: 'Gamalogic API key not configured' };
  }

  try {
    const url = `https://gamalogic.com/email-discovery/?firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&domain=${encodeURIComponent(domain)}&apikey=${apiKey}&speed_rank=0`;

    const result = await httpsGet(url);

    // Pass through Gamalogic's response directly
    return {
      email: result.email || null,
      certified: result.certified || null,
      error: result.error || false,
      error_code: result.error_code || null,
      error_message: result.error_message || null,
    };
  } catch (error) {
    return { error: true, error_message: error.message };
  }
});

// === CREDIT BALANCE CHECK ===
exports.checkCredits = functions.https.onCall(async (data, context) => {
  const apiKey = functions.config().gamalogic?.apikey || process.env.GAMALOGIC_API_KEY;
  if (!apiKey) return { error: true, error_message: 'No API key' };

  try {
    const url = `https://gamalogic.com/creditbalance/?apikey=${apiKey}`;
    return await httpsGet(url);
  } catch (error) {
    return { error: true, error_message: error.message };
  }
});
```

**`functions/package.json`** (if not already present):
```json
{
  "name": "talentrace-functions",
  "main": "index.js",
  "engines": { "node": "18" },
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0"
  }
}
```

**Deploy steps:**
```bash
cd functions
npm install
firebase functions:config:set gamalogic.apikey="YOUR_GAMALOGIC_API_KEY_HERE"
firebase deploy --only functions
```

**Test the function works before proceeding:**
```bash
# From your app or browser console:
const { getFunctions, httpsCallable } = require('firebase/functions');
const functions = getFunctions();
const findEmail = httpsCallable(functions, 'findEmail');
const result = await findEmail({ firstName: 'Yogesh', lastName: 'Agarwal', domain: 'daffodilsw.com' });
console.log(result.data);
```

---

### Part 2: Client-Side Service — Gamalogic via Cloud Function

**File:** Create `services/gamalogic.js`

```js
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const findEmailFn = httpsCallable(functions, 'findEmail');
const checkCreditsFn = httpsCallable(functions, 'checkCredits');

/**
 * Find a verified email for a person at a company.
 * Calls Gamalogic Email Finder via Firebase Cloud Function (avoids CORS).
 *
 * @param {string} firstName - Person's first name
 * @param {string} lastName - Person's last name
 * @param {string} domain - Company domain (e.g. "daffodilsw.com")
 * @returns {Object} { email, verified, error }
 */
export async function findVerifiedEmail(firstName, lastName, domain) {
  try {
    const result = await findEmailFn({ firstName, lastName, domain });
    const data = result.data;

    if (data.error) {
      console.warn('Gamalogic error:', data.error_message);
      return { email: null, verified: false, error: data.error_message };
    }

    if (data.email && data.certified === 'verified') {
      return { email: data.email, verified: true, error: null };
    }

    if (data.email) {
      // Email found but not verified
      return { email: data.email, verified: false, error: null };
    }

    // No email found
    return { email: null, verified: false, error: null };
  } catch (error) {
    console.error('Cloud Function call failed:', error.message);
    return { email: null, verified: false, error: error.message };
  }
}

/**
 * Check remaining Gamalogic credits.
 */
export async function checkGamalogicCredits() {
  try {
    const result = await checkCreditsFn();
    return result.data?.credits || 0;
  } catch (error) {
    return 0;
  }
}
```

---

### Part 3: Domain Discovery

**File:** Modify `services/search.js → findCompanyDomain()`

```js
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
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SERPER_API_KEY,  // EXPO_PUBLIC_SERPER_API_KEY
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
  // Query: plain text, no special characters
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
```

---

### Part 4: Find People (Serper + Gemini)

**File:** Modify `services/search.js` (add this function) and modify `services/extractor.js`

```js
/**
 * Search for people at a company matching the target role.
 * Returns raw snippets + LinkedIn results for processing.
 */
export async function searchPeople(company, targetRole) {
  // Single query: find people on LinkedIn with this role at this company
  // NEVER use quotes or @ — Serper returns 400
  const results = await serperSearch(
    `${company} ${targetRole} site:linkedin.com/in`,
    10
  );

  return results;
}
```

**File:** Modify `services/extractor.js`

```js
/**
 * Parse search results to extract person names, roles, and LinkedIn URLs.
 * First extracts LinkedIn URLs via regex (100% accurate).
 * Then uses Gemini to extract names + roles from snippets.
 */
export async function extractPeople(serperResults, company, targetRole, selectedModel) {
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
      console.error(`Gemini error: ${response.status}`);
      return [];
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
    return [];
  }
}
```

---

### Part 5: Name Parsing Helper

**File:** Add to `services/extractor.js`

```js
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
```

---

### Part 6: Cache

**File:** Create `services/cache.js`

```js
import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase'; // your existing firebase config import

/**
 * Check cache for a domain. Returns cached data or null.
 */
export async function checkCache(domain) {
  if (!domain) return null;
  try {
    const docRef = doc(db, 'domainCache', domain);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const ageDays = (Date.now() - (data.lastUpdatedAt?.toMillis?.() || 0)) / 86400000;

    if (ageDays > 365) return null; // Expired

    return {
      domain: data.domain,
      // Contacts expire at 30 days
      contacts: ageDays <= 30 ? (data.verifiedContacts || []) : [],
      hasFreshContacts: ageDays <= 30 && (data.verifiedContacts?.length > 0),
    };
  } catch (e) {
    console.warn('Cache read failed:', e.message);
    return null;
  }
}

/**
 * Save search results to cache. Fire-and-forget (don't await in main flow).
 */
export async function updateCache(domain, company, contacts) {
  if (!domain) return;
  try {
    const docRef = doc(db, 'domainCache', domain);
    const data = {
      domain,
      company,
      lastUpdatedAt: serverTimestamp(),
      searchCount: increment(1),
    };

    if (contacts?.length > 0) {
      data.verifiedContacts = contacts.map(c => ({
        name: c.name,
        email: c.email,
        role: c.role,
        linkedin: c.linkedin || null,
        verified: c.verified || false,
        savedAt: new Date().toISOString(),
      }));
    }

    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
}
```

---

### Part 7: Main Pipeline Orchestration

**File:** Modify `hooks/useSearch.js`

This is where everything connects. Modify the existing search function:

```js
import { findCompanyDomain, searchPeople } from '../services/search';
import { extractPeople, parseName } from '../services/extractor';
import { findVerifiedEmail } from '../services/gamalogic';
import { checkCache, updateCache } from '../services/cache';

async function performSearch(company, targetRole) {
  // ============================================
  // PRE-FLIGHT (EXISTING CODE — do not modify)
  // Firebase auth check, quota check, role resolution
  // targetRole = role.searchTarget
  // ============================================

  // === STEP 1: Find company domain ===
  const domain = await findCompanyDomain(company);
  if (!domain) {
    // Show error to user: "Could not find company website"
    return [];
  }

  // === CHECK CACHE ===
  const cache = await checkCache(domain);

  if (cache?.hasFreshContacts) {
    // Cache hit — return cached results directly
    // Still deduct quota (user initiated a search)
    return cache.contacts.map(c => ({
      ...c,
      fromCache: true,
      score: c.verified ? 90 : 50,
    }));
  }

  // === STEP 2: Find people at the company ===
  const serperResults = await searchPeople(company, targetRole);

  if (!serperResults || serperResults.length === 0) {
    return []; // No search results found
  }

  const people = await extractPeople(serperResults, company, targetRole, selectedModel);

  if (!people || people.length === 0) {
    return []; // No people found matching the role
  }

  // === STEP 3: Find verified emails for each person via Gamalogic ===
  const results = [];

  for (const person of people) {
    const parsed = parseName(person.name);
    if (!parsed) {
      // Can't parse name — include without email
      results.push({
        name: person.name,
        role: person.role,
        email: null,
        linkedin: person.linkedin,
        verified: false,
        score: person.linkedin ? 40 : 20,
        source: person.source,
      });
      continue;
    }

    // Call Gamalogic Email Finder via Cloud Function
    const emailResult = await findVerifiedEmail(parsed.first, parsed.last, domain);

    results.push({
      name: person.name,
      role: person.role,
      email: emailResult.email,
      linkedin: person.linkedin,
      verified: emailResult.verified,
      score: calculateScore(emailResult, person),
      source: person.source,
      gamalogicError: emailResult.error,
    });
  }

  // === STEP 4: Sort by score ===
  results.sort((a, b) => b.score - a.score);

  // === STEP 5: Cache results (non-blocking) ===
  const contactsToCache = results.filter(r => r.email);
  updateCache(domain, company, contactsToCache).catch(() => {});

  // ============================================
  // QUOTA DEDUCTION (EXISTING CODE — do not modify)
  // deductQuota() or equivalent
  // ============================================

  return results;
}

/**
 * Calculate confidence score for a contact.
 */
function calculateScore(emailResult, person) {
  let score = 0;

  // Email found and verified
  if (emailResult.email && emailResult.verified) score += 50;
  // Email found but unverified
  else if (emailResult.email) score += 25;

  // Has LinkedIn profile
  if (person.linkedin) score += 25;

  // Has source citation (AI found them in real snippets)
  if (person.source) score += 15;

  // Has role info
  if (person.role) score += 10;

  return Math.min(score, 100);
}
```

---

### Part 8: Nightly Cache Cleanup

**File:** Add to `functions/index.js`

```js
// Add this to your existing functions/index.js

exports.cleanupDomainCache = functions.pubsub
  .schedule('0 2 * * *')  // 2 AM daily
  .timeZone('UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const snapshot = await db.collection('domainCache').get();
    const now = Date.now();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const ts = data.lastUpdatedAt?.toMillis?.() || 0;
      const ageDays = (now - ts) / 86400000;

      // Rule 1: Delete entire document if > 365 days
      if (ageDays > 365) {
        await docSnap.ref.delete();
        continue;
      }

      // Rule 2: Clear contacts at 30 days (pattern/domain stay for a year)
      if (ageDays > 30 && data.verifiedContacts?.length > 0) {
        await docSnap.ref.update({
          verifiedContacts: admin.firestore.FieldValue.delete(),
        });
      }
    }

    console.log('Cache cleanup done');
    return null;
  });
```

**Note:** Add `const admin = require('firebase-admin');` and `admin.initializeApp();` at the top of `functions/index.js` if not already there.

---

## UI UPDATES

Adapt the existing results display to show:

| Field | How to display |
|-------|---------------|
| `name` | Person's full name (existing) |
| `role` | Job title (existing) |
| `email` | Email address — show if not null (existing) |
| `linkedin` | LinkedIn link/icon — show if not null (existing) |
| `verified` | If `true`: show ✅ "Verified" badge next to email |
| `verified` | If `false` and email exists: show ⚠️ "Unverified" |
| `verified` | If `false` and no email: show "Email not found" |
| `score` | Optional: show as confidence bar or percentage |

---

## RESULT SHAPE

Each result object looks like:

```json
{
  "name": "Yogesh Agarwal",
  "role": "CTO",
  "email": "yogesh.agarwal@daffodilsw.com",
  "linkedin": "https://linkedin.com/in/yogeshagarwal",
  "verified": true,
  "score": 90,
  "source": "Yogesh Agarwal - CTO at Daffodil"
}
```

---

## ENVIRONMENT VARIABLES

```env
# EXISTING — do not rename or remove
EXPO_PUBLIC_SERPER_API_KEY=your_serper_key
EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key

# NEW — add this (only used for display/monitoring, actual key is in Firebase config)
EXPO_PUBLIC_GAMALOGIC_API_KEY=your_gamalogic_key

# FIREBASE CONFIG — set via CLI, NOT in .env
# firebase functions:config:set gamalogic.apikey="your_gamalogic_key"
```

---

## FILES SUMMARY

| File | Action | What |
|------|--------|------|
| `functions/index.js` | CREATE or MODIFY | Cloud Function proxy for Gamalogic + nightly cache cleanup |
| `functions/package.json` | CREATE if missing | Dependencies for Cloud Functions |
| `services/gamalogic.js` | CREATE | Client-side wrapper that calls Cloud Function |
| `services/cache.js` | CREATE | Firestore cache read/write |
| `services/search.js` | MODIFY | Add blacklist to `findCompanyDomain()`, add `searchPeople()`, add `serperSearch()` helper |
| `services/extractor.js` | MODIFY | Replace AI prompt (names-only), add `extractPeople()`, add `parseName()` |
| `hooks/useSearch.js` | MODIFY | Wire new pipeline: domain → people → email finder → cache |
| Settings page | MODIFY | Change default model to `gemini-2.5-flash` |
| `.env` | MODIFY | Add `EXPO_PUBLIC_GAMALOGIC_API_KEY` |

---

## COST BREAKDOWN

| Component | Calls per search | Cost |
|-----------|-----------------|------|
| Serper (domain) | 1 | $0.004 |
| Serper (people) | 1 | $0.004 |
| Gemini Flash | 1 | ~$0.0005 |
| Gamalogic Email Finder | up to 5 | 5 free credits |
| Firebase Cloud Function | up to 5 | Free tier covers this |
| **Total** | | **~$0.009** |

Free credits: 500 on Gamalogic signup. At 5 credits/search = **100 free searches**.

---

## DEPLOYMENT ORDER

1. Sign up at https://gamalogic.com — get API key — note: 500 free credits
2. `firebase functions:config:set gamalogic.apikey="YOUR_KEY"`
3. `cd functions && npm install && firebase deploy --only functions`
4. Test Cloud Function: call `findEmail` with test data, verify it returns an email
5. THEN apply all client-side code changes
6. Test end-to-end: search "Daffodil Software" with role "CTO"
7. Test with 2+ more companies and different roles