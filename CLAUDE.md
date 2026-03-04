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

### Search Pipeline (`hooks/useSearch.js`)

The core 5-step pipeline orchestrated by `useSearch`:

1. **`findCompanyDomain()`** (`services/search.js`) — 1 Serper call to find the company's domain
2. **`searchHRContacts()`** (`services/search.js`) — 2 parallel Serper calls: LinkedIn people search + email pattern/contact search
3. **`extractWithAI()`** (`services/extractor.js`) — OpenRouter (Gemini 2.5 Flash Lite by default) parses raw search snippets and returns compact JSON with people, domain, and email patterns
4. **`generateEmailCandidates()`** (`services/extractor.js`) — Merges AI-detected email patterns with `COMMON_PATTERNS`, generates candidate emails from name + domain
5. **`validateContacts()`** (`services/validator.js`) — Format check → generic domain check → MX record lookup via Google DNS-over-HTTPS (no API key needed)

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

## Key Conventions

- All React Native styles use `StyleSheet.create` inline within each component file — no CSS/styled-components.
- Components always spread `theme.*` from `useTheme()` into style props; hardcoded colors are not used.
- Email sending requires Google OAuth sign-in (Settings → Email Sending). There is no fallback email provider.
- The `areKeysConfigured()` check in `services/storage.js` reads from `process.env` directly (env vars, not SecureStore).
