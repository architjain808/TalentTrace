import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithGoogle } from '../services/googleAuth';
import { getUserProfile } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

// ─── Main Setup Screen ─────────────────────────────────────────
export default function SetupScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const [googleSignedIn, setGoogleSignedIn] = useState(false);
    const [googleEmail, setGoogleEmail] = useState('');
    const [signingIn, setSigningIn] = useState(false);

    const handleGoogleSignIn = async () => {
        setSigningIn(true);
        try {
            const result = await signInWithGoogle();
            setGoogleSignedIn(true);
            setGoogleEmail(result.userEmail || '');
            showToast('success', 'Signed In!', `Connected as ${result.userEmail}`);
        } catch (err) {
            console.error(err);
            // Ignore cancellation errors
            if (err.code !== 'ASYNC_OP_IN_PROGRESS' && err.code !== 'SIGN_IN_CANCELLED') {
                showToast('error', 'Sign-In Failed', err.message || 'Could not sign in with Google.');
            }
        } finally {
            setSigningIn(false);
        }
    };

    const handleFinish = async () => {
        let hasRole = false;
        if (auth.currentUser) {
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile && profile.role) {
                hasRole = true;
            }
        }

        if (hasRole) {
            showToast('success', 'Setup Complete!', 'You\'re ready to find HR contacts.');
            router.replace('/');
        } else {
            router.replace('/role-select');
        }
    };

    const handleSkip = () => {
        showToast('info', 'Skipped', 'You can set up Google email later in Settings.');
        router.replace('/');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerArea}>
                    <Text style={styles.logoIcon}>📧</Text>
                    <Text style={[styles.title, { color: theme.text }]}>Email Setup</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        Sign in to send emails from your Gmail
                    </Text>
                </View>

                {/* Google Sign-In Card */}
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <Text style={styles.cardIcon}>🔐</Text>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Sign in with Google</Text>
                    <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                        Sign in with your Google account to send emails directly from your Gmail. We only request permission to send emails — nothing else.
                    </Text>

                    {googleSignedIn ? (
                        <View style={[styles.connectedCard, { backgroundColor: '#e8f5e9', borderColor: '#66bb6a' }]}>
                            <Text style={styles.connectedIcon}>✅</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.connectedTitle, { color: '#2e7d32' }]}>Connected!</Text>
                                <Text style={[styles.connectedEmail, { color: '#388e3c' }]}>{googleEmail}</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={[styles.googleBtn, signingIn && { opacity: 0.7 }]}
                            onPress={handleGoogleSignIn}
                            disabled={signingIn || !request}
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
                    )}

                    <View style={[styles.infoBox, { backgroundColor: theme.accentLight }]}>
                        <Text style={[styles.infoText, { color: theme.accent }]}>
                            🔒 We only request "Send Email" permission. We cannot read, delete, or access your inbox.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                    onPress={handleFinish}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryBtnText}>🚀 Start Using TalentTrace</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                    <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip for now — set up later in Settings</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    pageContent: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 56 : 60,
        paddingBottom: 40,
    },
    headerArea: { alignItems: 'center', marginBottom: 20 },
    logoIcon: { fontSize: 44, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800' },
    subtitle: { fontSize: 14, fontWeight: '500', marginTop: 2, textAlign: 'center' },

    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
    },
    cardIcon: { fontSize: 36, marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    cardDesc: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },

    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    skipBtn: { alignItems: 'center', paddingVertical: 16 },
    skipText: { fontSize: 14, fontWeight: '500' },

    // Google Sign-In
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 14,
        gap: 10,
        marginBottom: 12,
    },
    googleBtnIcon: { fontSize: 20, fontWeight: '700', color: '#4285F4' },
    googleBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
    connectedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 10,
        marginBottom: 12,
    },
    connectedIcon: { fontSize: 20 },
    connectedTitle: { fontSize: 15, fontWeight: '700' },
    connectedEmail: { fontSize: 13, fontWeight: '500', marginTop: 2 },

    infoBox: {
        alignSelf: 'stretch',
        borderRadius: 10,
        padding: 12,
        marginTop: 4,
    },
    infoText: { fontSize: 13, lineHeight: 18 },
});
