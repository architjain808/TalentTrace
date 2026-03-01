import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Check if all required API keys are configured
export async function areKeysConfigured() {
    const serper = await getSecureKey('SERPER_API_KEY');
    const openrouter = await getSecureKey('OPENROUTER_API_KEY');
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
