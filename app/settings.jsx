import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../hooks/useSettings';
import { getSecureKey, saveSecureKey, loadSettings, saveSettings } from '../services/storage';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

const API_KEYS = [
    { key: 'SERPER_API_KEY', label: 'Serper API Key', desc: 'Google Search', required: true },
    { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', desc: 'AI Extraction', required: true },
    { key: 'EMAILJS_SERVICE_ID', label: 'EmailJS Service ID', desc: 'Email Sending', required: false },
    { key: 'EMAILJS_TEMPLATE_ID', label: 'EmailJS Template ID', desc: 'Email Template', required: false },
    { key: 'EMAILJS_PUBLIC_KEY', label: 'EmailJS Public Key', desc: 'Email Auth', required: false },
    { key: 'EMAILJS_PRIVATE_KEY', label: 'EmailJS Private Key', desc: 'For non-browser apps', required: false },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const { settings } = useSettings();
    const [keys, setKeys] = useState({});
    const [visibility, setVisibility] = useState({});
    const [modelName, setModelName] = useState('google/gemini-2.5-flash-lite');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const loaded = {};
            for (const item of API_KEYS) {
                const val = await getSecureKey(item.key);
                loaded[item.key] = val || '';
            }
            setKeys(loaded);
            const s = await loadSettings();
            setModelName(s.openrouterModel || 'google/gemini-2.5-flash-lite');
            setLoading(false);
        })();
    }, []);

    const toggleVisibility = (key) => {
        setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveKeys = async () => {
        setSaving(true);
        try {
            for (const item of API_KEYS) {
                const val = keys[item.key]?.trim();
                if (val) await saveSecureKey(item.key, val);
            }
            const currentSettings = await loadSettings();
            await saveSettings({ ...currentSettings, openrouterModel: modelName.trim() || 'google/gemini-2.5-flash-lite' });
            showToast('success', 'Settings Saved', 'Your settings have been updated.');
        } catch {
            showToast('error', 'Error', 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={theme.statusBar} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
                <View style={{ width: 56 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Info */}
                    <View style={[styles.infoBox, { backgroundColor: theme.accentLight }]}>
                        <Text style={styles.infoIcon}>💡</Text>
                        <Text style={[styles.infoText, { color: theme.accent }]}>
                            Email templates are managed at emailjs.com dashboard.
                        </Text>
                    </View>

                    {/* AI Model */}
                    <Text style={[styles.section, { color: theme.text }]}>AI Model</Text>
                    <View style={[styles.keyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <View style={styles.keyHeader}>
                            <Text style={[styles.keyLabel, { color: theme.text }]}>OpenRouter Model</Text>
                        </View>
                        <Text style={[styles.keyDesc, { color: theme.textMuted }]}>Model used for HR contact extraction</Text>
                        <TextInput
                            style={[styles.keyInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                            value={modelName}
                            onChangeText={setModelName}
                            placeholder="google/gemini-2.5-flash-lite"
                            placeholderTextColor={theme.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* API Keys */}
                    <Text style={[styles.section, { color: theme.text }]}>API Keys</Text>

                    {loading ? (
                        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
                    ) : (
                        API_KEYS.map((item) => (
                            <View key={item.key} style={[styles.keyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                                <View style={styles.keyHeader}>
                                    <Text style={[styles.keyLabel, { color: theme.text }]}>{item.label}</Text>
                                    <Text style={[styles.keyBadge, { color: theme.textMuted }]}>
                                        {item.required ? 'Required' : 'Optional'}
                                    </Text>
                                </View>
                                <Text style={[styles.keyDesc, { color: theme.textMuted }]}>{item.desc}</Text>
                                <View style={styles.keyInputRow}>
                                    <TextInput
                                        style={[styles.keyInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                        value={keys[item.key] || ''}
                                        onChangeText={(val) => setKeys((prev) => ({ ...prev, [item.key]: val }))}
                                        placeholder={item.label + '...'}
                                        placeholderTextColor={theme.textMuted}
                                        secureTextEntry={!visibility[item.key]}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        style={[styles.viewBtn, { backgroundColor: theme.bgTertiary }]}
                                        onPress={() => toggleVisibility(item.key)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.viewIcon}>{visibility[item.key] ? '🙈' : '👁️'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}

                    {/* Save */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.accent }, saving && { opacity: 0.7 }]}
                        onPress={handleSaveKeys}
                        disabled={saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Settings</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 48 : 12,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: { paddingVertical: 4, paddingRight: 8 },
    backText: { fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    section: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 4 },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 10,
        padding: 12,
        marginTop: 8,
        marginBottom: 24,
        gap: 8,
    },
    infoIcon: { fontSize: 14 },
    infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
    keyCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    keyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    keyLabel: { fontSize: 14, fontWeight: '600' },
    keyBadge: { fontSize: 11, fontWeight: '500' },
    keyDesc: { fontSize: 12, marginBottom: 10 },
    keyInputRow: { flexDirection: 'row', gap: 8 },
    keyInput: {
        flex: 1,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    viewBtn: { width: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    viewIcon: { fontSize: 18 },
    saveBtn: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
