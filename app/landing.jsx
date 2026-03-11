import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithGoogle } from '../services/googleAuth';
import { USER_ROLES } from '../services/storage';
import { getUserProfile } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

export default function LandingScreen() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const [signingIn, setSigningIn] = useState(false);

    const handleGoogleSignIn = async () => {
        setSigningIn(true);
        try {
            const result = await signInWithGoogle();
            showToast('success', 'Signed In!', `Welcome, ${result.userName || result.userEmail}`);
            
            // Check Firebase for existing role
            let hasRole = false;
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile && profile.role) {
                    hasRole = true;
                }
            }

            router.replace(hasRole ? '/' : '/role-select');
        } catch (err) {
            console.error(err);
            if (err.code !== 'ASYNC_OP_IN_PROGRESS' && err.code !== 'SIGN_IN_CANCELLED') {
                showToast('error', 'Sign-In Failed', err.message || 'Could not sign in with Google.');
            }
        } finally {
            setSigningIn(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={theme.statusBar} />

            <View style={styles.content}>
                {/* Logo / Brand */}
                <View style={styles.brand}>
                    <Text style={styles.logoIcon}>📧</Text>
                    <Text style={[styles.appName, { color: theme.text }]}>TalentTrace</Text>
                    <Text style={[styles.tagline, { color: theme.textMuted }]}>
                        Find HR contacts. Send cold emails.{'\n'}Land your next job faster.
                    </Text>
                </View>

                {/* Feature highlights */}
                <View style={[styles.featuresCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    {[
                        ['🔍', 'AI-powered HR contact discovery'],
                        ['✅', 'DNS-verified email addresses'],
                        ['📨', 'Send directly from Gmail'],
                    ].map(([icon, label], i, arr) => (
                        <View
                            key={i}
                            style={[
                                styles.featureRow,
                                i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
                            ]}
                        >
                            <Text style={styles.featureIcon}>{icon}</Text>
                            <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>{label}</Text>
                        </View>
                    ))}
                </View>

                {/* Sign-in button */}
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

                <Text style={[styles.notice, { color: theme.textMuted }]}>
                    We only request permission to send emails.{'\n'}We cannot read or access your inbox.
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'center',
        paddingBottom: Platform.OS === 'android' ? 32 : 0,
    },
    brand: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoIcon: { fontSize: 60, marginBottom: 12 },
    appName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10 },
    tagline: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    },
    featuresCard: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 32,
        overflow: 'hidden',
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        gap: 14,
    },
    featureIcon: { fontSize: 20 },
    featureLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dadce0',
        paddingVertical: 15,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    googleBtnIcon: { fontSize: 20, fontWeight: '800', color: '#4285F4' },
    googleBtnText: { fontSize: 16, fontWeight: '600', color: '#3c4043' },
    notice: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
});
