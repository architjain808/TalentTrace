# TalentTrace → OutreachAI: Product Strategy & Actionable Rebuild Plan

> **Prepared by:** Senior Product Engineer + Business Analyst review
> **Date:** 2026-03-10
> **Status:** Draft — awaiting founder review before implementation

---

## 1. Executive Summary

TalentTrace is currently a single-use-case tool: find HR email addresses at a company for job seekers. The underlying technology pipeline — Google Search → AI Extraction → Email Generation → DNS Validation → Gmail Send — is fundamentally **use-case agnostic**. With targeted changes to the search queries, AI prompts, UI copy, and template system, this app can be repositioned as an **intelligent cold outreach platform** that serves multiple high-value user segments, all sharing the same core need: *reach the right person at any company directly*.

The total addressable market expands dramatically. The engineering lift is modest. The opportunity is real.

---

## 2. Current State Analysis

### What the app does today

The five-step pipeline in `hooks/useSearch.js`:

1. `findCompanyDomain()` — finds the company's website domain via Serper
2. `searchHRContacts()` — runs **two hardcoded HR-specific queries** via Serper
3. `extractWithAI()` — AI prompt explicitly asks for **HR/recruiting contacts only**
4. `generateEmailCandidates()` — pattern-matches email addresses (generic, reusable)
5. `validateContacts()` — DNS/MX validation (generic, reusable)

### Where the HR lock-in lives (specific file references)

| Location | Hardcoded HR Bias |
|---|---|
| `services/search.js:39` | Query: `"HR recruiter talent acquisition contact site:linkedin.com/in"` |
| `services/search.js:52` | Query: `"email contact phone number HR recruiter"` |
| `constants/prompts.js:1` | System prompt: `"expert at extracting HR/recruiter contact information"` |
| `constants/prompts.js:18` | User prompt: `"Extract up to 5 HR/recruiting contacts"` |
| `constants/prompts.js:42` | Fallback message: `"If you see no HR contacts at all..."` |
| `services/storage.js:68–80` | Starter templates: both are job-seeker pitch templates |
| `components/DirectSend.jsx:68` | Subtitle: `"Already know the HR contact?"` |
| `components/DirectSend.jsx:119` | Placeholder: `"e.g. Talent Acquisition"` |
| `app/index.jsx:111` | Empty state title: `"Find HR Contacts"` |
| `app/index.jsx:113` | Empty state desc: HR/job-seeker specific copy |
| `app/landing.jsx` | Tagline: `"Find HR contacts. Send cold emails."` |

### What is already generic (and reusable as-is)

- Email pattern generation (`services/extractor.js` — `COMMON_PATTERNS`, `generateEmailCandidates`)
- DNS/MX validation (`services/validator.js`)
- Gmail send infrastructure (`services/gmailSender.js`, `services/mailer.js`)
- Template variable system (`services/storage.js` — `fillTemplate`)
- Auth and quota system (`services/googleAuth.js`, `firebase/userCRUD`)
- The entire theme system and component library

**Assessment:** ~30% of the app is HR-specific by text/prompt. The other 70% is already a generic cold-outreach engine waiting to be unlocked.

---

## 3. Market Opportunity & Target Users

### Primary User Segments

#### Segment A — Job Seekers *(current, keep)*
**Goal:** Reach HR managers, recruiters, hiring managers, talent acquisition leads at target companies.
**Pain:** Job boards are saturated. Direct outreach to the right person dramatically increases response rates.
**Volume:** Massive. Hundreds of millions of job seekers globally.
**Willingness to pay:** Medium (they are often between jobs). Freemium works well.

**Search intent example:** `"Google" → HR Manager, Recruiter, Talent Acquisition`

---

#### Segment B — Freelancers & Independent Consultants *(high priority, new)*
**Goal:** Reach decision-makers (CMO, Creative Director, Marketing Manager, Head of Product) to pitch services.
**Pain:** Cold DMs on LinkedIn are noisy. Getting a direct email to the right person is a massive conversion advantage.
**Volume:** 1.5 billion freelancers globally. Growing fastest in design, development, copywriting, video production.
**Willingness to pay:** High. One closed deal via the app pays for months of subscription.

**Search intent example:** `"Shopify" → Head of Marketing, Creative Director`

---

#### Segment C — Startup Founders & Business Development *(high priority, new)*
**Goal:** Reach procurement leads, VPs of Engineering, CTOs, or Operations heads at potential client companies to sell their SaaS or service.
**Pain:** B2B sales cycles start with finding the right person. Cold email consistently outperforms cold LinkedIn for conversion.
**Volume:** Tens of millions of founders and BD professionals.
**Willingness to pay:** Very high. Revenue directly attributable.

**Search intent example:** `"Stripe" → Head of Procurement, VP Engineering`

---

#### Segment D — Sales Development Representatives (SDRs) *(medium priority, new)*
**Goal:** Build prospect lists for specific departments at target accounts.
**Pain:** Tools like Apollo and Hunter are expensive ($50–$200/month). This app can undercut on price for small teams.
**Volume:** Millions of SDRs globally.
**Willingness to pay:** High, but expect comparison with Apollo/Hunter.

**Search intent example:** `"Tesla" → VP of Sales, Sales Director`

---

#### Segment E — PR & Media Outreach *(medium priority, new)*
**Goal:** Find editors, journalists, podcast producers at media companies.
**Pain:** Press contact pages are outdated. Finding the specific journalist who covers your beat is tedious.
**Volume:** Smaller niche, but high value per outreach.
**Willingness to pay:** Medium.

**Search intent example:** `"TechCrunch" → Editor, Journalist, Senior Reporter`

---

#### Segment F — Recruiters (Outbound Sourcing) *(low priority, niche)*
**Goal:** Find passive candidates at competitor companies.
**Pain:** LinkedIn Recruiter is expensive.
**Note:** This is a legal gray area in some regions. Proceed with caution.

---

### Segments to explicitly NOT target

- **Mass spam / bulk unsolicited email campaigns** — damages sender reputation, violates Gmail TOS, creates legal exposure (CAN-SPAM, GDPR). The app's per-quota model naturally limits this, which is a feature, not a bug.
- **Political outreach** — high controversy, low ROI on product reputation.

---

## 4. Product Vision & Repositioning

### Proposed Rename

**From:** TalentTrace
**To:** **OutreachAI** *(or* **PitchPath** *or* **ContactIQ** — pick one that's not trademarked)*

> Rationale: "TalentTrace" telegraphs HR/hiring. The new name must be role-neutral and signal intelligence + outreach.

### New Positioning Statement

> **OutreachAI** finds the right person at any company, verifies their email, and lets you send a personalized cold email — directly from your Gmail — in under 2 minutes.

### New Tagline Options

| Option | Fits |
|---|---|
| "Find anyone. Reach them directly." | Clean, broad |
| "Cold email that actually lands." | Outcome-focused |
| "The smart way to reach any company." | Trust-focused |
| "From search to inbox in 60 seconds." | Speed-focused |

### Three-Pillar Value Prop

1. **Find** — AI discovers the right contact at any company for your specific goal
2. **Verify** — DNS-validated emails only, so your outreach actually arrives
3. **Send** — Personalized emails from your own Gmail in one tap

---

## 5. The Single Most Important UX Change

The entire expansion hinges on **one new input field**.

**Current search input:** Company Name (single field)

**New search input:**
```
Company Name: [________________]
Who to contact: [________________]  ← NEW
  Quick picks: [HR] [CTO] [CMO] [CEO] [Founder] [Marketing] [Sales]
```

This `targetRole` field propagates through the entire pipeline:
- Into the Serper search queries (replacing hardcoded "HR recruiter")
- Into the AI extraction prompt (replacing "HR/recruiting contacts")
- Into template selection (surfaces relevant templates for the intent)

Everything else in the app can remain structurally identical. This is the unlock.

---

## 6. Gap Analysis & Actionable Changes

### 6.1 `services/search.js` — Parameterize Search Queries

**Current (hardcoded HR):**
```js
// Query 1
q: `${company} HR recruiter talent acquisition contact site:linkedin.com/in`

// Query 2
q: `${company} ${domain} email contact phone number HR recruiter`
```

**Required change:**
Add `targetRole` parameter to `searchHRContacts(company, domain, targetRole)`:

```js
// Query 1 — find people matching the target role on LinkedIn
q: `${company} ${targetRole} site:linkedin.com/in`

// Query 2 — find email pattern + contact info for that role
q: `${company} ${domain} ${targetRole} email contact`
```

**File:** `services/search.js` — update function signature and both query strings.

---

### 6.2 `constants/prompts.js` — Generalize AI Prompts

#### System Prompt (replace entirely)

**Current:**
```
You are an expert at extracting HR/recruiter contact information from web search results.
```

**New:**
```
You are an expert at extracting professional contact information from web search results.
You find real people at companies based on their role or department.
```

#### User Prompt (`buildExtractionPrompt`)

**Current signature:** `buildExtractionPrompt(company, domain, snippets)`
**New signature:** `buildExtractionPrompt(company, domain, snippets, targetRole)`

**Current extract instruction:**
```
Extract up to 5 HR/recruiting contacts from the above search results.
```

**New:**
```
Extract up to 5 contacts from the above search results who match or are relevant to: "${targetRole}".
Prioritize people whose job title closely matches the target role.
If no exact match is found, extract the most senior or relevant contacts available.
```

**Current fallback:**
```
If you see no HR contacts at all, return: {"d":"...","p":[...],"c":[]}
```

**New:**
```
If you find no contacts matching "${targetRole}", return: {"d":"...","p":[...],"c":[]}
```

**Full updated prompt template — write this verbatim in `constants/prompts.js`:**

```js
export const EXTRACTION_SYSTEM_PROMPT = `You are an expert at extracting professional contact information from web search results.
You identify real people at companies based on their role or department.

CRITICAL RULES:
1. Only return names and roles that ACTUALLY appear in the search snippets. Do NOT invent people.
2. For emails: ONLY include an email if you see the EXACT email address in the snippets. If you guess or construct an email, set it to null.
3. For email patterns: Look for clues in the snippets. If you see any employee email like "john.doe@company.com", the pattern is "firstname.lastname". Extract the real pattern, do not guess.
4. For LinkedIn: Only include a URL if you see a real linkedin.com/in/ URL in the snippets.
5. For phone numbers: Include any phone/mobile numbers found associated with the contact. Set to null if not found.
6. Set confidence: "high" if you found the person's actual email in results, "medium" if you found their name + role, "low" if information is uncertain.
7. Return VALID JSON only. No markdown, no explanation, just JSON.`;

export function buildExtractionPrompt(company, domain, snippets, targetRole = 'key contact') {
  return `Company: ${company}
Domain: ${domain}
Looking for: ${targetRole}

Search Results:
${snippets}

Extract up to 5 contacts from the above search results who match or are relevant to: "${targetRole}".
Prioritize people whose job title closely matches the target role.
If no exact match is found, extract the most senior or relevant contacts available.

Return JSON in this exact format:
{
  "d": "${domain}",
  "p": ["firstname.lastname"],
  "c": [
    {
      "n": "Full Name",
      "r": "Job Title",
      "e": "actual-email@domain.com or null if not found in results",
      "l": "https://linkedin.com/in/profile or null",
      "ph": "+1234567890 or null",
      "cf": "high|medium|low"
    }
  ]
}

IMPORTANT:
- "p" = email patterns you OBSERVED in the search results (e.g. if you saw jane.smith@${domain}, the pattern is "firstname.lastname")
- "e" = set to null unless you saw the EXACT email in the search results. Do NOT fabricate emails.
- "cf" = confidence: "high" if email was found in results, "medium" if name/role found but email was not, "low" if uncertain
- "ph" = phone/mobile number if found, null otherwise
- If you find no contacts matching "${targetRole}", return: {"d":"${domain}","p":["firstname.lastname"],"c":[]}`;
}
```

---

### 6.3 `hooks/useSearch.js` — Accept & Pass `targetRole`

**Current:** `search(company)` — single argument
**New:** `search(company, targetRole)` — two arguments

Changes needed:
1. Add `targetRole` to `search` function signature
2. Pass `targetRole` to `searchHRContacts(company, domain, targetRole)`
3. Pass `targetRole` to `extractWithAI(company, domain, searchResults, targetRole)`
4. Update `STEPS` array — replace HR-specific text:

**Current STEPS:**
```js
const STEPS = [
    'Finding company domain...',
    'Searching for HR contacts...',
    'Extracting contacts with AI...',
    'Generating email candidates...',
    'Validating emails...',
    'Done!',
];
```

**New STEPS:**
```js
const STEPS = [
    'Finding company domain...',
    'Searching for contacts...',
    'Extracting contacts with AI...',
    'Generating email candidates...',
    'Validating emails...',
    'Done!',
];
```

Update error messages:
- `'No HR contacts found. Try a different company name.'` → `'No contacts found. Try a different company name or target role.'`

---

### 6.4 `services/extractor.js` — Pass `targetRole` Through

Update `extractWithAI(company, domain, searchSnippets, targetRole)`:

```js
// Pass targetRole into the prompt builder
const prompt = buildExtractionPrompt(company, domain, searchSnippets, targetRole);
```

No other changes needed to this file.

---

### 6.5 `components/SearchBar.jsx` — Add Target Role Field

Add a second input field below the company name input. This is the most visible UX change.

**New fields:**
1. **Company Name** — `"e.g. Google, Stripe, Shopify"` (existing)
2. **Who to Contact** — `"e.g. CTO, Marketing Manager, HR"` (new)

**Quick-pick role chips below the second field:**

```
[HR / Recruiter]  [CTO]  [CEO / Founder]  [Marketing]  [Sales]  [Finance]
```

Tapping a chip fills the "Who to Contact" field.

**Search button behavior:** Both fields required. Calls `onSearch(company, targetRole)`.

---

### 6.6 `app/index.jsx` — Update UI Copy & Pass `targetRole`

**Current `handleSearch`:**
```js
const handleSearch = async (company) => {
    const found = await search(company);
    ...
};
```

**New:**
```js
const handleSearch = async (company, targetRole) => {
    const found = await search(company, targetRole);
    ...
};
```

**Empty state copy changes:**

| Location | Current | New |
|---|---|---|
| Empty state title | `"Find HR Contacts"` | `"Find Anyone at Any Company"` |
| Empty state desc | HR/job seeker specific | `"Enter a company name and the type of person you want to reach — AI finds, verifies, and helps you email them directly."` |
| Feature row 1 | `"Google-powered search"` | `"AI-targeted contact discovery"` |
| Feature row 4 | `"One-click sending"` | `"Send from your Gmail in one tap"` |

---

### 6.7 `components/DirectSend.jsx` — Generalize Copy

| Location | Current | New |
|---|---|---|
| Title | `"Direct Email Send"` | `"Send Direct Email"` |
| Subtitle | `"Already know the HR contact? Send an email directly..."` | `"Already have a contact's email? Send a personalized cold email directly."` |
| Role placeholder | `"e.g. Talent Acquisition"` | `"e.g. CTO, Marketing Manager, HR"` |

---

### 6.8 `app/landing.jsx` — Rewrite Copy for Broad Audience

**Current tagline:**
> Find HR contacts. Send cold emails. Land your next job faster.

**New tagline:**
> Find the right person at any company.
> Verify their email. Reach them directly.

**Current feature list:**
```
AI-powered HR contact discovery
DNS-verified email addresses
Send directly from Gmail
```

**New feature list:**
```
Target any role — HR, CTO, Marketing, Sales, Founders
AI-discovered, DNS-verified contacts
Send personalized emails from your Gmail
```

---

### 6.9 `services/storage.js` — Expand Starter Templates

Replace the current 2 job-seeker templates with 5 use-case templates:

```js
const STARTER_TEMPLATES = [
    {
        id: 'tpl_job_seeker',
        name: 'Job Application',
        subject: 'Exploring Opportunities at {{company}}',
        body: 'Hi {{name}},\n\nI came across your profile and noticed you work in {{role}} at {{company}}. I am very interested in exploring opportunities that match my background.\n\nWould you be open to a quick call or could you point me toward the right process?\n\nBest regards',
    },
    {
        id: 'tpl_freelance_pitch',
        name: 'Freelance Pitch',
        subject: 'Quick Idea for {{company}}',
        body: 'Hi {{name}},\n\nI specialize in [your skill] and came across {{company}} — I think I can help with [specific problem or opportunity].\n\nI have done similar work for [reference client]. Happy to share examples if useful.\n\nWould a quick 15-minute call make sense?\n\nBest',
    },
    {
        id: 'tpl_sales_outreach',
        name: 'Sales Outreach',
        subject: 'Helping {{company}} with [Problem]',
        body: 'Hi {{name}},\n\nI noticed {{company}} [observation about their business]. Companies like yours typically face [common challenge].\n\nWe help solve this with [your solution]. We have worked with [similar companies].\n\nWorth a 20-minute conversation?\n\nBest regards',
    },
    {
        id: 'tpl_partnership',
        name: 'Partnership Proposal',
        subject: 'Partnership Opportunity — {{company}} + [Your Company]',
        body: 'Hi {{name}},\n\nI lead [your role] at [your company]. We work with companies like {{company}} on [area of collaboration].\n\nI think there is a genuine opportunity for us to work together on [specific idea].\n\nAre you the right person to explore this, or could you point me in the right direction?\n\nBest regards',
    },
    {
        id: 'tpl_follow_up',
        name: 'Follow Up',
        subject: 'Following Up — {{company}}',
        body: 'Hi {{name}},\n\nI wanted to follow up on my previous email. I understand you are busy, but I genuinely believe [reason this is relevant to them].\n\nEven a quick reply to let me know if this is worth discussing would be hugely appreciated.\n\nThank you',
    },
];
```

---

### 6.10 App Name & Branding (Recommendation)

**Proposed name:** **OutreachAI**

If renaming, update:
- `app.json` (or `app.config.js`) — `name`, `slug`
- `app/index.jsx` header title
- `app/landing.jsx` logo text
- EAS build configuration
- App Store / Play Store listings

If keeping "TalentTrace" (lower risk): update only the tagline and UI copy. The name is less critical than the positioning.

---

## 7. New App Flow

### Screen Map (updated)

```
/landing          ← not signed in (Google sign-in)
    ↓ sign in
/                 ← main screen (two tabs)
    ├── Tab 1: Find Contacts
    │     ├── [Company Name] input
    │     ├── [Who to Contact] input + role chips    ← NEW
    │     ├── Search button
    │     ├── ProgressSteps (5 steps)
    │     └── ResultsTable → EmailCard → send
    └── Tab 2: Direct Send
          ├── Email, Name, Company, Role inputs
          └── Template picker → EmailEditor → send
/settings         ← gear icon from header
    ├── Google Account (sign in/out)
    ├── Quota balance
    ├── Email Templates (manage up to 5)
    └── AI Model picker
```

### Proposed Future Screen: `/history` *(Phase 2)*

A log of all searches and emails sent, per session, stored locally. High user value for tracking outreach campaigns.

---

## 8. What NOT to Change

These work correctly and should not be touched:

- `services/validator.js` — DNS/MX validation is perfectly generic
- `services/gmailSender.js` — RFC 2822 email builder is generic
- `services/mailer.js` — `sendColdEmail` / `sendBulkEmails` are generic
- `services/googleAuth.js` — auth flow is complete
- `services/storage.js` — `fillTemplate`, `saveEmailTemplate`, `deleteEmailTemplate` are generic
- `firebase/` — quota and user CRUD system
- `constants/theme.js` — design system is solid
- `components/ProgressSteps.jsx`, `StatusBadge.jsx`, `Toast.jsx` — reusable as-is
- `components/EmailEditor.jsx`, `TemplatePicker.jsx` — reusable as-is
- `hooks/useSettings.js` — reusable as-is

---

## 9. Implementation Roadmap

### Phase 1 — Unlock (3–5 days, high leverage, low risk)

These changes make the app multi-use-case with minimal code changes:

| # | Change | File(s) | Effort |
|---|---|---|---|
| 1 | Update AI system prompt | `constants/prompts.js` | 30 min |
| 2 | Parameterize `buildExtractionPrompt` with `targetRole` | `constants/prompts.js` | 30 min |
| 3 | Parameterize Serper queries with `targetRole` | `services/search.js` | 30 min |
| 4 | Pass `targetRole` through `extractWithAI` | `services/extractor.js` | 15 min |
| 5 | Pass `targetRole` through `useSearch` hook | `hooks/useSearch.js` | 30 min |
| 6 | Add "Who to Contact" field + chips to SearchBar | `components/SearchBar.jsx` | 2–3 hrs |
| 7 | Wire `targetRole` in index.jsx `handleSearch` | `app/index.jsx` | 15 min |
| 8 | Update all UI copy (index, DirectSend, landing) | 3 files | 1 hr |
| 9 | Expand starter templates to 5 use cases | `services/storage.js` | 30 min |

**Total Phase 1 estimate:** ~1.5–2 working days

---

### Phase 2 — Polish (1–2 weeks)

| # | Change | Description |
|---|---|---|
| 10 | Use-case intent selector on landing | Let user pick "Job Seeker / Freelancer / Sales / Other" — pre-fills `targetRole` default |
| 11 | Search history (local) | Store last 10 searches in AsyncStorage — let user re-run or view previous results |
| 12 | Bulk send | Select multiple results → send one template to all (already exists in `sendBulkEmails`) |
| 13 | "Save contact" | Save found contacts to a local list for future follow-ups |
| 14 | App rename + store listing update | Rebrand to OutreachAI across all surfaces |

---

### Phase 3 — Growth (Month 2+)

| # | Change | Description |
|---|---|---|
| 15 | AI email drafting | Instead of templates, user describes their goal → AI writes the first draft |
| 16 | Reply tracking (webhook) | Notify user when recipient opens or replies (requires backend) |
| 17 | Contact export | Export found contacts as CSV |
| 18 | Quota top-up via payment | In-app purchase for quota packs |

---

## 10. Summary of All Text/Copy Changes

### `constants/prompts.js`

| Element | Old Text | New Text |
|---|---|---|
| System prompt line 1 | `"You are an expert at extracting HR/recruiter contact information..."` | `"You are an expert at extracting professional contact information..."` |
| System prompt line 2 | *(none)* | `"You find real people at companies based on their role or department."` |
| User prompt extract line | `"Extract up to 5 HR/recruiting contacts from the above search results."` | `"Extract up to 5 contacts...who match or are relevant to: \"${targetRole}\". Prioritize people whose job title closely matches the target role."` |
| User prompt fallback | `"If you see no HR contacts at all, return: ..."` | `"If you find no contacts matching \"${targetRole}\", return: ..."` |

### `services/search.js`

| Element | Old Text | New Text |
|---|---|---|
| Query 1 | `"${company} HR recruiter talent acquisition contact site:linkedin.com/in"` | `"${company} ${targetRole} site:linkedin.com/in"` |
| Query 2 | `"${company} ${domain} email contact phone number HR recruiter"` | `"${company} ${domain} ${targetRole} email contact"` |
| No-results error | `"No HR contacts found in search results."` | `"No contacts found in search results."` |

### `hooks/useSearch.js`

| Element | Old Text | New Text |
|---|---|---|
| STEPS[1] | `"Searching for HR contacts..."` | `"Searching for contacts..."` |
| Empty result error | `"No HR contacts found. Try a different company name."` | `"No contacts found. Try a different company name or target role."` |

### `app/index.jsx`

| Element | Old Text | New Text |
|---|---|---|
| Empty state title | `"Find HR Contacts"` | `"Find Anyone at Any Company"` |
| Empty state description | HR/job-seeker specific | `"Enter a company and who you want to reach — AI finds, verifies, and helps you email them directly."` |

### `components/DirectSend.jsx`

| Element | Old Text | New Text |
|---|---|---|
| Component subtitle | `"Already know the HR contact? Send an email directly without searching."` | `"Already have a contact's email? Send a personalized cold email directly."` |
| Role field placeholder | `"e.g. Talent Acquisition"` | `"e.g. CTO, Marketing Manager, HR"` |

### `app/landing.jsx`

| Element | Old Text | New Text |
|---|---|---|
| Tagline | `"Find HR contacts. Send cold emails.\nLand your next job faster."` | `"Find the right person at any company.\nVerify their email. Reach them directly."` |
| Feature 1 | `"AI-powered HR contact discovery"` | `"Target any role — HR, CTO, Marketing, Sales"` |
| Feature 2 | `"DNS-verified email addresses"` | `"AI-discovered, DNS-verified contacts"` |
| Feature 3 | `"Send directly from Gmail"` | `"Send personalized emails from your Gmail"` |

---

## 11. Risk Flags

| Risk | Mitigation |
|---|---|
| Serper query quality drops without "HR" keyword anchoring | Test with several non-HR searches before releasing; tune query phrasing |
| AI extracts irrelevant people when `targetRole` is vague | Prompt engineering: add "If the target role is unclear, extract the most senior contacts" |
| Users abuse the app to send spam | Quota system already limits this; add a visible "responsible use" note |
| Email deliverability / Gmail rate limits | Already sent from user's own Gmail account — not a shared relay; Gmail's own limits apply |
| Template `MAX_TEMPLATES = 5` is now too restrictive with 5 starters | Increase to 10, or separate starter templates from user-created ones |

---

*This document covers everything needed for Phase 1 implementation. Review, adjust priorities, and begin with `constants/prompts.js` and `services/search.js` as they are the highest-leverage, lowest-risk changes.*
