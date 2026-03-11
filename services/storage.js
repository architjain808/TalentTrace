import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// === User Roles ===
export const USER_ROLES = [
    {
        id: 'job_seeker',
        label: 'Job Seeker',
        icon: '💼',
        description: 'Looking for job opportunities at companies',
        searchTarget: 'HR Manager, Recruiter, Talent Acquisition, Hiring Manager',
        resultLabel: 'HR & recruiting contacts',
    },
    {
        id: 'freelancer',
        label: 'Freelancer / Consultant',
        icon: '🎨',
        description: 'Pitching your skills and services to businesses',
        searchTarget: 'Marketing Manager, Creative Director, CMO, Head of Product, Brand Manager',
        resultLabel: 'decision-maker contacts',
    },
    {
        id: 'sales',
        label: 'Sales / Business Dev',
        icon: '📈',
        description: 'Prospecting clients and closing B2B deals',
        searchTarget: 'VP Sales, Head of Procurement, Operations Director, CTO, Founder',
        resultLabel: 'sales decision-maker contacts',
    },
    {
        id: 'startup_founder',
        label: 'Startup Founder',
        icon: '🚀',
        description: 'Reaching partners, investors, or enterprise clients',
        searchTarget: 'CEO, Founder, CTO, VP Engineering, Head of Partnerships',
        resultLabel: 'leadership contacts',
    },
    {
        id: 'marketing',
        label: 'Marketing Professional',
        icon: '📣',
        description: 'Reaching brand and marketing decision-makers',
        searchTarget: 'CMO, Marketing Manager, Brand Director, Growth Lead, Digital Marketing Head',
        resultLabel: 'marketing contacts',
    },
    {
        id: 'media_pr',
        label: 'PR / Media',
        icon: '📰',
        description: 'Finding journalists, editors, and media contacts',
        searchTarget: 'Editor, Journalist, Senior Reporter, Content Director, Media Contact',
        resultLabel: 'media contacts',
    },
    {
        id: 'recruiter',
        label: 'Recruiter',
        icon: '🔍',
        description: 'Sourcing talent and candidates at companies',
        searchTarget: 'Software Engineer, Product Manager, Designer, Senior Developer, Tech Lead',
        resultLabel: 'candidate contacts',
    },
];

export function getRoleById(id) {
    if (!id) return null;
    return USER_ROLES.find((r) => r.id === id) || null;
}

// === Secure Storage (API Keys) ===
// expo-secure-store works on native; fallback to AsyncStorage on web
export async function saveSecureKey(key, value) {
    if (Platform.OS === 'web') {
        await AsyncStorage.setItem(`secure_${key}`, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

export async function getSecureKey(key) {
    if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(`secure_${key}`);
    }
    return await SecureStore.getItemAsync(key);
}

export async function deleteSecureKey(key) {
    if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(`secure_${key}`);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}

// Check if all required API keys are configured via environment variables
export async function areKeysConfigured() {
    const serper = process.env.EXPO_PUBLIC_SERPER_API_KEY;
    const openrouter = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    return !!(serper && openrouter);
}

// === Settings (AsyncStorage) ===
const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS = {
    resumeUri: null,
    resumeName: null,
    openrouterModel: 'google/gemini-2.5-flash-lite',
};

export async function loadSettings() {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export { DEFAULT_SETTINGS };

// === Email Templates (AsyncStorage) ===
const TEMPLATES_KEY = 'email_templates';
const DEFAULT_TEMPLATE_KEY = 'default_template_id';
const MAX_TEMPLATES = 5;

// Default templates that ship with the app
const STARTER_TEMPLATES = [
    {
        id: 'tpl_cold_outreach',
        name: 'Cold Outreach',
        subject: 'Interested in Opportunities at {{company}}',
        body: 'Hi {{name}},\n\nI came across your profile and noticed you work in {{role}} at {{company}}. I am very interested in exploring opportunities there.\n\nI would love to connect and learn more about any openings that match my background.\n\nBest regards',
    },
    {
        id: 'tpl_follow_up',
        name: 'Follow Up',
        subject: 'Following Up \u2014 {{company}} Opportunities',
        body: 'Hi {{name}},\n\nI wanted to follow up on my previous email regarding potential opportunities at {{company}}.\n\nI am still very interested and would appreciate any guidance you can offer.\n\nThank you',
    },
];


/**
 * Get all saved email templates. Returns starter templates on first use.
 */
export async function getEmailTemplates() {
    try {
        const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
        if (!raw) {
            // First time — save and return starter templates
            await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(STARTER_TEMPLATES));
            return STARTER_TEMPLATES;
        }
        return JSON.parse(raw);
    } catch {
        return STARTER_TEMPLATES;
    }
}

/**
 * Save or update a template. Enforces max 5 limit.
 */
export async function saveEmailTemplate(template) {
    const templates = await getEmailTemplates();

    const existingIndex = templates.findIndex((t) => t.id === template.id);

    if (existingIndex >= 0) {
        // Update existing
        templates[existingIndex] = { ...templates[existingIndex], ...template };
    } else {
        // Add new
        if (templates.length >= MAX_TEMPLATES) {
            throw new Error(`Maximum ${MAX_TEMPLATES} templates allowed. Delete one first.`);
        }
        templates.push({
            ...template,
            id: template.id || `tpl_${Date.now()}`,
        });
    }

    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    return templates;
}

/**
 * Delete a template by ID
 */
export async function deleteEmailTemplate(id) {
    const templates = await getEmailTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
    return filtered;
}

/**
 * Set the default template ID (pre-selected in picker)
 */
export async function setDefaultTemplate(id) {
    await AsyncStorage.setItem(DEFAULT_TEMPLATE_KEY, id);
}

/**
 * Get the default template ID
 */
export async function getDefaultTemplateId() {
    return await AsyncStorage.getItem(DEFAULT_TEMPLATE_KEY);
}

/**
 * Replace template variables with actual contact data
 */
export function fillTemplate(text, { name, company, role, email }) {
    if (!text) return '';
    return text
        .replace(/\{\{name\}\}/gi, name || '')
        .replace(/\{\{company\}\}/gi, company || '')
        .replace(/\{\{role\}\}/gi, role || '')
        .replace(/\{\{email\}\}/gi, email || '');
}

