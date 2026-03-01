import { useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../services/storage';

export function useSettings() {
    const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load settings on mount
    useEffect(() => {
        (async () => {
            try {
                const loaded = await loadSettings();
                setSettingsState(loaded);
            } catch {
                setSettingsState(DEFAULT_SETTINGS);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const updateSettings = useCallback((updates) => {
        setSettingsState((prev) => ({ ...prev, ...updates }));
    }, []);

    const persistSettings = useCallback(async () => {
        setSaving(true);
        try {
            await saveSettings(settings);
            return true;
        } catch {
            return false;
        } finally {
            setSaving(false);
        }
    }, [settings]);

    const resetSettings = useCallback(async () => {
        setSettingsState(DEFAULT_SETTINGS);
        await saveSettings(DEFAULT_SETTINGS);
    }, []);

    return {
        settings,
        loading,
        saving,
        updateSettings,
        persistSettings,
        resetSettings,
    };
}

