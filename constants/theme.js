import React, { createContext, useContext, useState } from 'react';

// ─── Design System Tokens (UI Redesign Reference §2) ────────────────────────
export const DS = {
    primaryDark:          '#144516',   // §2.1 — dark brand green, nav bar, headers
    primary:              '#416943',   // §2.1 — mid green, secondary surfaces
    accent:               '#B0EC70',   // §2.1 — lime, CTAs, active states (use sparingly)
    accentLight:          'rgba(176, 236, 112, 0.15)', // lime tint for active pills
    accentGlow:           'rgba(176, 236, 112, 0.5)',  // glow on active indicator
    surfaceLight:         '#D7E2D6',   // §2.1 — light card bg, inputs, muted surfaces
    bgDark:               '#0D2E10',   // §2.1 — deep dark background (onboarding)
    bgDarkAlt:            '#0D1F0F',   // §10  — dark mode page bg
    white:                '#FFFFFF',
    textPrimary:          '#1A1A1A',   // §2.1 — body text on light
    textSecondary:        '#6B7B6E',   // §2.1 — muted/secondary text on light
    textOnDark:           '#FFFFFF',   // §2.1 — text on dark backgrounds
    textOnDarkMuted:      'rgba(255,255,255,0.7)',
    textOnDarkDim:        'rgba(255,255,255,0.5)',
    success:              '#4CAF50',
    danger:               '#E53935',
    dangerLight:          '#FFEBEE',
};

const light = {
    mode: 'light',
    // ── Page & surface ───────────────────────────────────────────────────────
    bg:           '#FFFFFF',       // §2.1 — page background (was #f8fafc)
    bgSecondary:  '#FFFFFF',
    bgTertiary:   DS.surfaceLight,
    // ── Cards ────────────────────────────────────────────────────────────────
    card:         '#FFFFFF',
    cardBorder:   DS.surfaceLight,
    // ── Borders ──────────────────────────────────────────────────────────────
    border:       DS.surfaceLight,
    borderLight:  'rgba(215,226,214,0.5)',
    // ── Text ─────────────────────────────────────────────────────────────────
    text:         DS.textPrimary,
    textSecondary:'#475569',
    textMuted:    DS.textSecondary,
    // ── Accent (teal — kept for backward compat with ProgressSteps, ResultsTable, EmailCard) ─
    accent:       '#0d9488',
    accentLight:  '#ccfbf1',
    accentText:   '#ffffff',
    // ── New design system tokens ──────────────────────────────────────────────
    primaryDark:  DS.primaryDark,
    primary:      DS.primary,
    accentLime:   DS.accent,
    accentLimeLight: DS.accentLight,
    surfaceLight: DS.surfaceLight,
    bgDark:       DS.bgDark,
    textOnDark:   DS.textOnDark,
    // ── Semantic ─────────────────────────────────────────────────────────────
    success:      '#059669',
    successBg:    '#ecfdf5',
    error:        '#dc2626',
    errorBg:      '#fef2f2',
    warning:      '#d97706',
    warningBg:    '#fffbeb',
    // ── Input ────────────────────────────────────────────────────────────────
    inputBg:      DS.surfaceLight,
    inputBorder:  DS.surfaceLight,
    statusBar:    'dark',
};

const dark = {
    mode: 'dark',
    // ── Page & surface (§10) ─────────────────────────────────────────────────
    bg:           '#0D1F0F',       // §10 dark mode bg
    bgSecondary:  '#142816',
    bgTertiary:   '#1A3A1D',
    // ── Cards (§10) ──────────────────────────────────────────────────────────
    card:         '#142816',
    cardBorder:   '#1E4020',
    // ── Borders ──────────────────────────────────────────────────────────────
    border:       '#1E4020',
    borderLight:  'rgba(30,64,32,0.5)',
    // ── Text (§10) ───────────────────────────────────────────────────────────
    text:         '#E8F0E8',
    textSecondary:'#8FA893',
    textMuted:    '#8FA893',
    // ── Accent (teal — kept for backward compat) ──────────────────────────────
    accent:       '#14b8a6',
    accentLight:  'rgba(20, 184, 166, 0.15)',
    accentText:   '#ffffff',
    // ── New design system tokens (same accent — it's the brand) ───────────────
    primaryDark:  DS.primaryDark,
    primary:      DS.primary,
    accentLime:   DS.accent,
    accentLimeLight: DS.accentLight,
    surfaceLight: '#1A3A1D',   // §10 dark override
    bgDark:       DS.bgDark,
    textOnDark:   DS.textOnDark,
    // ── Semantic ─────────────────────────────────────────────────────────────
    success:      '#10b981',
    successBg:    'rgba(16, 185, 129, 0.12)',
    error:        '#f87171',
    errorBg:      'rgba(248, 113, 113, 0.12)',
    warning:      '#fbbf24',
    warningBg:    'rgba(251, 191, 36, 0.12)',
    // ── Input ────────────────────────────────────────────────────────────────
    inputBg:      '#0D1F0F',
    inputBorder:  '#1E4020',
    statusBar:    'light',
};

const ThemeContext = createContext({ theme: dark, isDark: true, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
    // Light mode only — dark mode removed per product decision
    const [isDark] = useState(false);

    const toggleTheme = () => {
        // No-op: dark mode disabled
    };

    const theme = isDark ? dark : light;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export { light, dark };
