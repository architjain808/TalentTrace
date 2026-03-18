# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TalentTrace** — a cross-platform React Native/Expo app that finds HR contacts at companies by chaining: Google Search (Serper) → AI extraction (OpenRouter/Gemini) → email generation → DNS validation → Gmail send.

## Commands

```bash
npm start             # Start Expo dev server (interactive menu)
npm run dev           # Start with nodemon (auto-restarts on source file changes)
npm run web           # Run in web browser
npm run android       # Run on Android device/emulator
npm run ios           # Run on iOS simulator

eas build --platform android --profile preview    # Build Android APK
eas build --platform android --profile production # Production build
eas build --platform ios --profile preview        # Build iOS
```

No test runner is configured in this project.

## Environment Variables

All API keys are loaded via `EXPO_PUBLIC_*` env vars from a `.env` file (gitignored):

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SERPER_API_KEY` | Yes | Google Search via serper.dev |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | Yes | AI extraction via openrouter.ai |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | For email sending | Google OAuth (web) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | For email sending | Google OAuth (Android) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET` | For email sending | Google OAuth web secret |

## Architecture

### Hooks (`hooks/`)

- `useSearch.js` — orchestrates the 5-step search pipeline (see below)
- `useSettings.js` — loads/saves app settings via `services/storage`; exposes `{ settings, loading, saving, updateSettings, persistSettings, resetSettings }`

### Search Pipeline (`hooks/useSearch.js`)

The core pipeline orchestrated by `useSearch`:

1. **`findCompanyDomain()`** (`services/search.js`) — 1 Serper call to find the company's domain
2. **`checkCache(domain, targetRole)`** (`services/cache.js`) — 3-tier cache check (see Cache Architecture below)
3. **`searchPeople()`** (`services/search.js`) — 1 Serper call to find LinkedIn profiles for the target role
4. **`extractPeople()`** (`services/extractor.js`) — OpenRouter (Gemini 2.5 Flash) extracts names + roles from snippets
5. **`findVerifiedEmail()`** (`services/gamalogic.js`) — Gamalogic via Firebase Cloud Function, per person
6. Results sorted by score → cached under `targetRole` key → quota deducted

### Cache Architecture (`services/cache.js`)

Firestore collection: `domainCache/{domain}`

**Document structure:**
```json
{
  "domain": "xyz.com",
  "company": "XYZ Corp",
  "lastUpdatedAt": "<Firestore timestamp>",
  "searchCount": 5,
  "contactsByRole": {
    "hr_manager":     { "contacts": [...], "savedAt": "<ISO string>" },
    "cto":            { "contacts": [...], "savedAt": "<ISO string>" },
    "sales_director": { "contacts": [...], "savedAt": "<ISO string>" }
  }
}
```

**Role key normalisation:** `normalizeRoleKey("HR Manager")` → `"hr_manager"` (lowercase, underscores, alphanumeric only, max 40 chars)

**3-tier cache check (`checkCache(domain, targetRole)`):**
- **Tier 1 — exact:** `contactsByRole[roleKey]` exists and is < 30 days old → return immediately, skip pipeline
- **Tier 2 — cross:** Other role keys have fresh contacts → run full pipeline for current role + surface cross-role contacts as secondary section
- **Tier 3 — miss:** No usable cache → run full pipeline

**Cache write (`updateCache`):** Uses `updateDoc` with dot-notation key (`contactsByRole.hr_manager`) so sibling role entries are NEVER overwritten. Falls back to `setDoc` if the document doesn't exist yet.

**Legacy cleanup:** Documents with the old flat `verifiedContacts` field (pre-role-partitioning) are deleted on first access.

**TTL:** Contacts expire at 30 days per role. Domain document expires at 365 days.

**`useSearch` exposes two result arrays:**
- `results` — primary: fresh pipeline results (or exact-cached)
- `extraResults` — secondary: cross-role cached contacts, deduplicated against primary

### Navigation (`app/`)

Expo Router file-based navigation. `_layout.jsx` wraps everything in `ThemeProvider` and redirects unauthenticated users to `/setup` if API keys are not configured.

- `/` (`index.jsx`) — Main screen with two tabs: "Find Contacts" (search pipeline) and "Direct Send"
- `/setup` — 2-page onboarding wizard for API key entry
- `/settings` — API key management + AI model picker + Google OAuth sign-in

### Services (`services/`)

| File | Responsibility |
|---|---|
| `search.js` | Serper API calls |
| `extractor.js` | OpenRouter API + email pattern generation |
| `validator.js` | Email validation (format + MX via DNS-over-HTTPS) |
| `storage.js` | SecureStore (Google OAuth tokens) + AsyncStorage (settings, templates) |
| `googleAuth.js` | Google OAuth PKCE flow; `useGoogleAuth()` hook + token exchange/refresh |
| `gmailSender.js` | Builds RFC 2822 MIME message, sends via Gmail API |
| `mailer.js` | High-level `sendColdEmail()` / `sendBulkEmails()` using `googleAuth` + `gmailSender` |

### Storage Layers

- **Google OAuth tokens** — `expo-secure-store` (native) / AsyncStorage with `secure_` prefix (web)
- **App settings** (AI model choice, resume) — AsyncStorage key `app_settings`
- **Email templates** — AsyncStorage key `email_templates` (max 5; starter templates ship with app)
- **Theme preference** — AsyncStorage key `theme_preference`

### Theme System (`constants/theme.js`)

`ThemeProvider` / `useTheme()` context wraps the entire app. Components access colors via `const { theme, isDark, toggleTheme } = useTheme()`. Dark/light tokens are defined in `light` and `dark` objects; system default on first launch, then persisted.

### AI Prompt Design (`constants/prompts.js`)

The OpenRouter prompt uses short single-character JSON keys (`d`, `p`, `c`, `n`, `r`, `e`, `l`, `ph`, `cf`) to minimize token usage (~800 tokens/search). The extractor in `services/extractor.js` handles both the compact keys and their verbose equivalents. Truncated JSON responses are salvaged by finding the last complete object before parsing.

## Email UI Component Map

**CRITICAL — there are two separate email editor implementations. Always edit the correct one:**

| Screen | File to edit | Component |
|---|---|---|
| Templates management screen (`/templates`) | `app/templates.jsx` | `TemplateEditor` — defined **inline** in that file, not imported |
| Email compose inside search results | `components/EmailCard.jsx` + `components/EmailEditor.jsx` | `EmailEditor` with `mode="compose"` + `embedded` prop |
| Email compose inside Direct Send tab | `components/DirectSend.jsx` + `components/EmailEditor.jsx` | Same `EmailEditor` with `embedded` prop |

**Rule:** Changes to `components/EmailEditor.jsx` have **zero effect** on the templates screen. Changes to `app/templates.jsx`'s `TemplateEditor` styles/JSX have **zero effect** on EmailCard/DirectSend.

### Padding Architecture (templates screen)

The `TemplateEditor` in `app/templates.jsx` uses an **edge-to-edge card** approach when the editor is open:
- `scrollContent` sets `paddingHorizontal: 0` when `showEditor === true`
- `editor.card` is `borderRadius: 0, borderWidth: 0` — fills screen width
- `editor.formBody` has `paddingHorizontal: 20` — the **single** horizontal padding level
- `fieldInputPill` / `bodyBox` have **no additional** horizontal padding or margin

Do not re-add nested padding (`fieldBox.marginHorizontal`, `formBody` padding + `fieldBox` padding simultaneously). One level only.

## Flow Documentation Rule

**Whenever any change is made to the search pipeline** (steps, APIs, caching, quota logic, or data flow in `hooks/useSearch.js`, `services/search.js`, `services/extractor.js`, `services/gamalogic.js`, `services/cache.js`, `functions/index.js`), **`flow.md` MUST be updated** to reflect the current flow before the task is considered complete. `flow.md` is the single source of truth for the pipeline architecture.

## Key Conventions

- All React Native styles use `StyleSheet.create` inline within each component file — no CSS/styled-components.
- New screens use hardcoded DS tokens (local `const C = {...}`) not `useTheme()` — dark mode was removed.
- Email sending requires Google OAuth sign-in (Settings → Email Sending). There is no fallback email provider.
- The `areKeysConfigured()` check in `services/storage.js` reads from `process.env` directly (env vars, not SecureStore).
