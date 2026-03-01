import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const light = {
    mode: 'light',
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#0d9488',
    accentLight: '#ccfbf1',
    accentText: '#ffffff',
    success: '#059669',
    successBg: '#ecfdf5',
    error: '#dc2626',
    errorBg: '#fef2f2',
    warning: '#d97706',
    warningBg: '#fffbeb',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    inputBg: '#f8fafc',
    inputBorder: '#cbd5e1',
    statusBar: 'dark',
};

const dark = {
    mode: 'dark',
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    border: '#334155',
    borderLight: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#14b8a6',
    accentLight: 'rgba(20, 184, 166, 0.15)',
    accentText: '#ffffff',
    success: '#10b981',
    successBg: 'rgba(16, 185, 129, 0.12)',
    error: '#f87171',
    errorBg: 'rgba(248, 113, 113, 0.12)',
    warning: '#fbbf24',
    warningBg: 'rgba(251, 191, 36, 0.12)',
    card: '#1e293b',
    cardBorder: '#334155',
    inputBg: '#0f172a',
    inputBorder: '#475569',
    statusBar: 'light',
};

const ThemeContext = createContext({ theme: dark, isDark: true, toggleTheme: () => { } });

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(systemScheme === 'dark');

    useEffect(() => {
        AsyncStorage.getItem('theme_preference').then((saved) => {
            if (saved !== null) setIsDark(saved === 'dark');
        });
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        AsyncStorage.setItem('theme_preference', next ? 'dark' : 'light');
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
