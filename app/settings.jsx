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
import { loadSettings, saveSettings } from '../services/storage';
import { signInWithGoogle, getAuthState, signOut as googleSignOut, isGoogleAuthConfigured } from '../services/googleAuth';
import { getUserProfile, updateQuotaBalance } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';
import EmailEditor from '../components/EmailEditor';

export default function SettingsScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const { settings } = useSettings();
    const [modelName, setModelName] = useState('google/gemini-2.5-flash-lite');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [googleState, setGoogleState] = useState({ isSignedIn: false, userEmail: null });
    const [signingIn, setSigningIn] = useState(false);
    
    // Quota State
    const [quotaBalance, setQuotaBalance] = useState(0);
    const [addingQuota, setAddingQuota] = useState(false);

    useEffect(() => {
        (async () => {
            const s = await loadSettings();
            setModelName(s.openrouterModel || 'google/gemini-2.5-flash-lite');
            const authState = await getAuthState();
            setGoogleState(authState);
            
            if (authState.isSignedIn && auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile) setQuotaBalance(profile.quotaBalance || 0);
            }
            
            setLoading(false);
        })();
    }, []);

    const handleGoogleSignIn = async () => {
        if (!isGoogleAuthConfigured()) {
            showToast('error', 'Not Configured', 'Google Client ID is missing. Check your .env file and restart the server.');
            return;
        }
        setSigningIn(true);
        try {
            const result = await signInWithGoogle();
            setGoogleState({ isSignedIn: true, userEmail: result.userEmail, userName: result.userName });
            showToast('success', 'Signed In!', `Connected as ${result.userEmail}`);
            
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile) setQuotaBalance(profile.quotaBalance || 0);
            }
        } catch (err) {
            console.error(err);
            if (err.code !== 'ASYNC_OP_IN_PROGRESS' && err.code !== 'SIGN_IN_CANCELLED') {
                showToast('error', 'Sign-In Failed', err.message || 'Could not sign in with Google.');
            }
        } finally {
            setSigningIn(false);
        }
    };

    const handleSignOut = async () => {
        await googleSignOut();
        setGoogleState({ isSignedIn: false, userEmail: null, userName: null });
        setQuotaBalance(0);
        showToast('info', 'Signed Out', 'Google account disconnected.');
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const currentSettings = await loadSettings();
            await saveSettings({ ...currentSettings, openrouterModel: modelName.trim() || 'google/gemini-2.5-flash-lite' });
            showToast('success', 'Settings Saved', 'Your settings have been updated.');
        } catch {
            showToast('error', 'Error', 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddQuota = async () => {
        if (!auth.currentUser) return;
        setAddingQuota(true);
        try {
            // Add arbitrary amount e.g. 10
            await updateQuotaBalance(auth.currentUser.uid, 10);
            
            // Refresh
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile) setQuotaBalance(profile.quotaBalance || 0);
            
            showToast('success', 'Quota Added', 'Successfully added 10 to your balance.');
        } catch (err) {
            showToast('error', 'Error', 'Failed to add quota.');
        } finally {
            setAddingQuota(false);
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

                    {/* ─── Email Sending (Google) ─── */}
                    <Text style={[styles.section, { color: theme.text }]}>📧 Email Sending</Text>

                    <View style={[styles.keyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <View style={styles.keyHeader}>
                            <Text style={[styles.keyLabel, { color: theme.text }]}>Google Account</Text>
                            <Text style={[styles.keyBadge, { color: googleState.isSignedIn ? '#4caf50' : theme.textMuted }]}>
                                {googleState.isSignedIn ? '● Connected' : '○ Not connected'}
                            </Text>
                        </View>

                        {googleState.isSignedIn ? (
                            <View>
                                <View style={styles.accountRow}>
                                    <Text style={[styles.connectedEmail, { color: theme.textSecondary }]}>
                                        {googleState.userEmail}
                                    </Text>
                                    <View style={styles.quotaBadge}>
                                        <Text style={styles.quotaText}>Quota: {quotaBalance}</Text>
                                    </View>
                                </View>
                                <View style={styles.accountActions}>
                                    <TouchableOpacity
                                        style={[styles.signOutBtn, { borderColor: '#ef5350', flex: 1 }]}
                                        onPress={handleSignOut}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.signOutText, { color: '#ef5350' }]}>Sign Out</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.addQuotaBtn, addingQuota && { opacity: 0.7 }]}
                                        onPress={handleAddQuota}
                                        disabled={addingQuota}
                                        activeOpacity={0.7}
                                    >
                                        {addingQuota ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={styles.addQuotaText}>Add Quota</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <Text style={[styles.keyDesc, { color: theme.textMuted }]}>
                                    Sign in to send emails from your Gmail
                                </Text>
                                <TouchableOpacity
                                    style={[styles.googleBtn, signingIn && { opacity: 0.7 }]}
                                    onPress={handleGoogleSignIn}
                                    disabled={signingIn}
                                    activeOpacity={0.8}
                                >
                                    {signingIn ? (
                                        <ActivityIndicator size="small" color="#333" />
                                    ) : (
                                        <>
                                            <Text style={styles.googleBtnIcon}>G</Text>
                                            <Text style={styles.googleBtnText}>Sign in with Google</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* ─── Email Templates ─── */}
                    <Text style={[styles.section, { color: theme.text }]}>📝 Email Templates</Text>
                    <EmailEditor mode="manage" />

                    {/* ─── AI Model ─── */}
                    <Text style={[styles.section, { color: theme.text, marginTop: 24 }]}>🤖 AI Model</Text>
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

                    {/* Save */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.accent }, saving && { opacity: 0.7 }]}
                        onPress={handleSaveSettings}
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

    // Google Sign-In
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 12,
        gap: 10,
        marginTop: 8,
    },
    googleBtnIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
    googleBtnText: { fontSize: 15, fontWeight: '600', color: '#333' },
    connectedEmail: { fontSize: 14, marginTop: 4 },
    signOutBtn: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    signOutText: { fontSize: 13, fontWeight: '600' },
    accountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    accountActions: {
        flexDirection: 'row',
        gap: 10,
    },
    quotaBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    quotaText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1976d2',
    },
    addQuotaBtn: {
        backgroundColor: '#1976d2',
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 10,
        flex: 1,
    },
    addQuotaText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
});
