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
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../hooks/useSettings';
import { loadSettings, saveSettings, USER_ROLES, getRoleById } from '../services/storage';
import { signInWithGoogle, getAuthState, signOut as googleSignOut, isGoogleAuthConfigured } from '../services/googleAuth';
import { getUserProfile, updateQuotaBalance, saveUserRoleToFirestore } from '../firebase/userCRUD';
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

    // Role State
    const [currentRole, setCurrentRole] = useState(null);
    const [showRolePicker, setShowRolePicker] = useState(false);

    useEffect(() => {
        (async () => {
            const s = await loadSettings();
            setModelName(s.openrouterModel || 'google/gemini-2.5-flash-lite');
            const authState = await getAuthState();
            setGoogleState(authState);

            if (authState.isSignedIn && auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile) {
                    setQuotaBalance(profile.quotaBalance || 0);
                    if (profile.role) {
                        setCurrentRole(getRoleById(profile.role));
                    }
                }
            }

            setLoading(false);
        })();
    }, []);

    const handleRoleChange = async (role) => {
        if (auth.currentUser) {
            try {
                await saveUserRoleToFirestore(auth.currentUser.uid, role.id);
            } catch (err) {
                console.error("Failed to sync role to Firebase:", err);
            }
        }
        setCurrentRole(role);
        setShowRolePicker(false);
        showToast('success', 'Profile Updated', `Switched to: ${role.label}`);
    };

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
        router.replace('/landing');
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

                    {/* ─── Your Profile (Role) ─── */}
                    <Text style={[styles.section, { color: theme.text }]}>🎯 Your Profile</Text>
                    <View style={[styles.keyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <View style={styles.keyHeader}>
                            <Text style={[styles.keyLabel, { color: theme.text }]}>Outreach Goal</Text>
                            <Text style={[styles.keyDesc, { color: theme.textMuted, marginBottom: 0 }]}>
                                Shapes the contacts we find for you
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.roleRow, { borderColor: theme.border }]}
                            onPress={() => setShowRolePicker(true)}
                            activeOpacity={0.7}
                        >
                            {currentRole ? (
                                <>
                                    <Text style={styles.roleRowIcon}>{currentRole.icon}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.roleRowLabel, { color: theme.text }]}>{currentRole.label}</Text>
                                        <Text style={[styles.roleRowDesc, { color: theme.textMuted }]}>{currentRole.description}</Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={[styles.roleRowLabel, { color: theme.textMuted }]}>Not set — tap to choose</Text>
                            )}
                            <Text style={[styles.roleRowChevron, { color: theme.textMuted }]}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Role Picker Modal */}
                    <Modal
                        visible={showRolePicker}
                        animationType="slide"
                        transparent
                        onRequestClose={() => setShowRolePicker(false)}
                    >
                        <TouchableOpacity
                            style={styles.modalBackdrop}
                            activeOpacity={1}
                            onPress={() => setShowRolePicker(false)}
                        />
                        <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
                            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Your Profile</Text>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {USER_ROLES.map((role) => {
                                    const isActive = currentRole?.id === role.id;
                                    return (
                                        <TouchableOpacity
                                            key={role.id}
                                            style={[
                                                styles.modalRoleRow,
                                                { borderBottomColor: theme.border },
                                                isActive && { backgroundColor: theme.accentLight },
                                            ]}
                                            onPress={() => handleRoleChange(role)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.modalRoleIcon}>{role.icon}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.modalRoleLabel, { color: theme.text }]}>{role.label}</Text>
                                                <Text style={[styles.modalRoleDesc, { color: theme.textMuted }]}>{role.description}</Text>
                                            </View>
                                            {isActive && (
                                                <Text style={[styles.modalCheck, { color: theme.accent }]}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Modal>

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

    // Role Picker
    roleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 10,
        gap: 10,
    },
    roleRowIcon: { fontSize: 22 },
    roleRowLabel: { fontSize: 14, fontWeight: '600' },
    roleRowDesc: { fontSize: 12, marginTop: 1 },
    roleRowChevron: { fontSize: 22, fontWeight: '300' },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '75%',
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 14,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
    modalRoleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    modalRoleIcon: { fontSize: 22 },
    modalRoleLabel: { fontSize: 14, fontWeight: '600' },
    modalRoleDesc: { fontSize: 12, marginTop: 2 },
    modalCheck: { fontSize: 18, fontWeight: '700' },

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
