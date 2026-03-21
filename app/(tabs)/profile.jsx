/**
 * Profile Screen — Account, outreach profile, and settings
 * Light mode only. Templates → separate /templates page.
 * Safe area insets for proper Android top spacing.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    ActivityIndicator,
    Modal,
    Animated,
    Easing,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, LogOut, User, FileText, CheckCircle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { USER_ROLES, getRoleById } from '../../services/storage';
import {
    signInWithGoogle, getAuthState, signOut as googleSignOut, isGoogleAuthConfigured,
} from '../../services/googleAuth';
import { getUserProfile, updateQuotaBalance, saveUserRoleToFirestore } from '../../firebase/userCRUD';
import { auth } from '../../firebase/config';
import { showToast } from '../../components/Toast';

const C = {
    primaryDark: '#144516',
    primary: '#416943',
    primaryMid: '#2D5A30',
    accent: '#B0EC70',
    accentLight: 'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white: '#FFFFFF',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7B6E',
    success: '#4CAF50',
    danger: '#E53935',
};

// §3.2 — type-overline section header
function SectionHeader({ label }) {
    return <Text style={sectionStyles.label}>{label.toUpperCase()}</Text>;
}

// Settings row — iOS-style with hairline divider
function SettingRow({ label, value, onPress, danger, last, icon: Icon, rightNode }) {
    return (
        <TouchableOpacity
            style={[rowStyles.row, last && rowStyles.last]}
            onPress={onPress}
            activeOpacity={onPress ? 0.6 : 1}
            disabled={!onPress}
            accessibilityLabel={label}
            accessibilityRole={onPress ? 'button' : 'text'}
        >
            {Icon && (
                <View style={rowStyles.iconBox}>
                    <Icon size={18} color={danger ? C.danger : C.primary} strokeWidth={1.5} />
                </View>
            )}
            <View style={rowStyles.left}>
                <Text style={[rowStyles.label, danger && rowStyles.labelDanger]}>{label}</Text>
                {value ? <Text style={rowStyles.value} numberOfLines={1}>{value}</Text> : null}
            </View>
            {rightNode !== undefined
                ? rightNode
                : onPress && <ChevronRight size={18} color={C.textSecondary} strokeWidth={1.5} />
            }
        </TouchableOpacity>
    );
}

function Card({ children }) {
    return <View style={cardStyles.card}>{children}</View>;
}

// Role picker bottom sheet modal — proper slide-up with animated backdrop
function RolePickerModal({ visible, currentRoleId, onSelect, onClose }) {
    const slideAnim = useRef(new Animated.Value(400)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1, duration: 260,
                    easing: Easing.out(Easing.ease), useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0, friction: 9, tension: 80, useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 0, duration: 200,
                    easing: Easing.in(Easing.ease), useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 400, duration: 220,
                    easing: Easing.in(Easing.ease), useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                {/* Dimming backdrop — absolute so it doesn't push sheet */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: 'rgba(0,0,0,0.45)', opacity: backdropAnim },
                    ]}
                >
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                {/* Sheet slides up */}
                <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={modalStyles.handle} />
                    <Text style={modalStyles.title}>Select Outreach Goal</Text>
                    <Text style={modalStyles.subtitle}>
                        Shapes which contacts we surface based on your goal
                    </Text>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ marginTop: 12 }}
                        bounces={false}
                    >
                        {USER_ROLES.map((role, i) => {
                            const isActive = currentRoleId === role.id;
                            return (
                                <TouchableOpacity
                                    key={role.id}
                                    style={[
                                        modalStyles.roleRow,
                                        i === USER_ROLES.length - 1 && modalStyles.roleRowLast,
                                        isActive && modalStyles.roleRowActive,
                                    ]}
                                    onPress={() => onSelect(role)}
                                    activeOpacity={0.65}
                                    accessibilityLabel={role.label}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: isActive }}
                                >
                                    {/* Icon container */}
                                    <View style={[modalStyles.roleIconBox, isActive && modalStyles.roleIconBoxActive]}>
                                        <Text style={modalStyles.roleIconText}>{role.icon}</Text>
                                    </View>

                                    {/* Label + description */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={[modalStyles.roleLabel, isActive && modalStyles.roleLabelActive]}>
                                            {role.label}
                                        </Text>
                                        <Text style={modalStyles.roleDesc}>{role.description}</Text>
                                    </View>

                                    {/* Selected indicator vs empty radio */}
                                    {isActive
                                        ? <CheckCircle size={22} color={C.primary} strokeWidth={2} fill={C.accent} />
                                        : <View style={modalStyles.radioEmpty} />
                                    }
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 8 }} />
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);
    const [addingQuota, setAddingQuota] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);

    const [googleState, setGoogleState] = useState({ isSignedIn: false, userEmail: null, userName: null });
    const [quotaBalance, setQuotaBalance] = useState(0);
    const [currentRole, setCurrentRole] = useState(null);

    // Card entrance animation
    const cardAnim = useRef(new Animated.Value(0)).current;
    const cardY = useRef(new Animated.Value(-20)).current;

    // Refresh quota + profile data every time this tab gains focus
    useFocusEffect(
        useCallback(() => {
            (async () => {
                const authState = await getAuthState();
                setGoogleState(authState);
                if (authState.isSignedIn && auth.currentUser) {
                    const profile = await getUserProfile(auth.currentUser.uid);
                    if (profile) {
                        setQuotaBalance(profile.quotaBalance || 0);
                        if (profile.role) setCurrentRole(getRoleById(profile.role));
                    }
                }
                setLoading(false);
            })();
        }, [])
    );

    // Entrance animation — runs once on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(cardAnim, { toValue: 1, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
            Animated.timing(cardY, { toValue: 0, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
        ]).start();
    }, []);

    const handleRoleChange = async (role) => {
        if (auth.currentUser) {
            try {
                await saveUserRoleToFirestore(auth.currentUser.uid, role.id);
            }
            catch (err) { console.error('Failed to sync role:', err); }
        }
        setCurrentRole(role);
        setShowRolePicker(false);
        showToast('success', 'Profile Updated', `Switched to: ${role.label}`);
    };

    const handleGoogleSignIn = async () => {
        if (!isGoogleAuthConfigured()) {
            showToast('error', 'Not Configured', 'Google Client ID missing. Check your .env file.');
            return;
        }
        setSigningIn(true);
        try {
            const result = await signInWithGoogle();
            setGoogleState({ isSignedIn: true, userEmail: result.userEmail, userName: result.userName });
            showToast('success', 'Connected', `Signed in as ${result.userEmail}`);
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile) setQuotaBalance(profile.quotaBalance || 0);
            }
        } catch (err) {
            if (err.code !== 'ASYNC_OP_IN_PROGRESS' && err.code !== 'SIGN_IN_CANCELLED') {
                showToast('error', 'Sign-In Failed', err.message || 'Could not sign in.');
            }
        } finally { setSigningIn(false); }
    };

    const handleSignOut = async () => {
        await googleSignOut();
        setGoogleState({ isSignedIn: false, userEmail: null, userName: null });
        setQuotaBalance(0);
        router.replace('/landing');
    };

    const handleAddQuota = () => {
        // Redirect to the new official Google Play Billing flow in settings
        router.push('/settings');
    };

    const getInitials = () => {
        if (googleState.userName) {
            return googleState.userName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        }
        if (googleState.userEmail) return googleState.userEmail[0].toUpperCase();
        return '?';
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header — logo-dark on white header background */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/logo-dark.png')}
                    style={styles.headerLogo}
                    resizeMode="cover"
                    accessibilityLabel="TalentTrace logo"
                />
                <Text style={styles.headerTitle}>Account</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* §6.2 — Profile card (gradient balance-card style) */}
                <Animated.View
                    style={{ opacity: cardAnim, transform: [{ translateY: cardY }], marginBottom: 8 }}
                >
                    {googleState.isSignedIn ? (
                        <LinearGradient
                            colors={[C.primaryDark, C.primaryMid, C.primary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.profileCard}
                        >
                            <View style={styles.profileCardTop}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{getInitials()}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    {googleState.userName
                                        ? <Text style={styles.profileName} numberOfLines={1}>{googleState.userName}</Text>
                                        : null
                                    }
                                    <Text style={styles.profileEmail} numberOfLines={1}>{googleState.userEmail}</Text>
                                </View>
                                <View style={styles.quotaPill}>
                                    <Text style={styles.quotaAmount}>{quotaBalance}</Text>
                                    <Text style={styles.quotaLabel}>credits</Text>
                                </View>
                            </View>
                            <View style={styles.profileCardBottom}>
                                <View style={styles.connectedRow}>
                                    <View style={styles.connectedDot} />
                                    <Text style={styles.connectedText}>Connected to Gmail</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addCreditsBtn}
                                    onPress={handleAddQuota}
                                    activeOpacity={0.75}
                                    accessibilityLabel="Buy Credits"
                                >
                                    <Text style={styles.addCreditsText}>Buy Credits</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    ) : (
                        <View style={styles.profileCardDisconnected}>
                            <View style={styles.profileCardTop}>
                                <View style={[styles.avatarCircle, styles.avatarDisconnected]}>
                                    <User size={24} color={C.textSecondary} strokeWidth={1.5} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.profileName, { color: C.textPrimary }]}>Not signed in</Text>
                                    <Text style={[styles.profileEmail, { color: C.textSecondary }]}>Connect Google to send emails</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </Animated.View>

                {/* ── Account ── */}
                <SectionHeader label="Account" />
                <Card>
                    {googleState.isSignedIn ? (
                        <SettingRow
                            label="Gmail"
                            value={googleState.userEmail}
                            icon={User}
                            last
                            rightNode={
                                <View style={styles.connectedBadge}>
                                    <View style={styles.connectedBadgeDot} />
                                    <Text style={styles.connectedBadgeText}>Connected</Text>
                                </View>
                            }
                        />
                    ) : (
                        <TouchableOpacity
                            style={styles.googleSignInRow}
                            onPress={handleGoogleSignIn}
                            disabled={signingIn}
                            activeOpacity={0.8}
                        >
                            {signingIn ? (
                                <ActivityIndicator size="small" color={C.primaryDark} />
                            ) : (
                                <>
                                    <View style={styles.googleIconBox}>
                                        <Text style={styles.googleIconText}>G</Text>
                                    </View>
                                    <Text style={styles.googleSignInText}>Sign in with Google</Text>
                                    <ChevronRight size={18} color={C.textSecondary} strokeWidth={1.5} />
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </Card>

                {/* ── Outreach Profile ── */}
                <SectionHeader label="Outreach Profile" />
                <Card>
                    <SettingRow
                        label="My Goal"
                        value={currentRole ? currentRole.label : 'Not set'}
                        onPress={() => setShowRolePicker(true)}
                        last
                    />
                </Card>

                {/* ── Content ── */}
                <SectionHeader label="Content" />
                <Card>
                    {/* Email Templates → separate screen */}
                    <SettingRow
                        label="Email Templates"
                        value="Manage your templates"
                        icon={FileText}
                        onPress={() => router.push('/templates')}
                        last
                    />
                </Card>

                {/* ── Sign Out ── */}
                {googleState.isSignedIn && (
                    <TouchableOpacity
                        style={styles.signOutBtn}
                        onPress={handleSignOut}
                        activeOpacity={0.7}
                        accessibilityLabel="Sign out"
                    >
                        <LogOut size={16} color={C.textSecondary} strokeWidth={1.5} />
                        <Text style={styles.signOutBtnText}>Sign Out</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 32 }} />
            </ScrollView>

            <RolePickerModal
                visible={showRolePicker}
                currentRoleId={currentRole?.id}
                onSelect={handleRoleChange}
                onClose={() => setShowRolePicker(false)}
            />
        </View>
    );
}

const sectionStyles = StyleSheet.create({
    label: {
        fontSize: 11, fontWeight: '600', letterSpacing: 0.88,
        color: C.textSecondary, marginTop: 24, marginBottom: 8,
        marginLeft: 4, textTransform: 'uppercase',
    },
});

const rowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.surfaceLight,
        minHeight: 52, gap: 12,
    },
    last: { borderBottomWidth: 0 },
    iconBox: {
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center',
    },
    left: { flex: 1, marginRight: 4 },
    label: { fontSize: 15, fontWeight: '500', color: C.textPrimary },
    labelDanger: { color: C.danger },
    value: { fontSize: 13, marginTop: 2, color: C.textSecondary },
});

const cardStyles = StyleSheet.create({
    card: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
});

const modalStyles = StyleSheet.create({
    sheet: {
        backgroundColor: C.white,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 48 : 24,
        maxHeight: '82%',
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28,
        shadowOffset: { width: 0, height: -6 }, elevation: 28,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: C.surfaceLight,
        alignSelf: 'center', marginTop: 12, marginBottom: 20,
    },
    title: { fontSize: 20, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.4 },
    subtitle: { fontSize: 13, marginTop: 6, color: C.textSecondary, lineHeight: 18 },

    roleRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 10,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.surfaceLight,
        gap: 12, borderRadius: 14, marginHorizontal: -4,
    },
    roleRowLast: { borderBottomWidth: 0 },
    roleRowActive: {
        backgroundColor: C.accentLight,
        borderBottomColor: 'transparent',
    },

    roleIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: C.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
    },
    roleIconBoxActive: { backgroundColor: C.accent },
    roleIconText: { fontSize: 20 },

    roleLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
    roleLabelActive: { color: C.primaryDark },
    roleDesc: { fontSize: 12, marginTop: 3, color: C.textSecondary, lineHeight: 16 },

    radioEmpty: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: C.surfaceLight,
    },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.white },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: C.surfaceLight,
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    headerLogo: { width: 32, height: 32, borderRadius: 16 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.primaryDark, letterSpacing: -0.3 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

    // Profile card
    profileCard: {
        borderRadius: 16, padding: 20, gap: 12,
        shadowColor: C.primaryDark, shadowOpacity: 0.25, shadowRadius: 32, shadowOffset: { width: 0, height: 8 }, elevation: 10,
    },
    profileCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    profileCardDisconnected: {
        borderRadius: 16, backgroundColor: C.surfaceLight, padding: 20,
        borderWidth: 1, borderColor: 'rgba(215,226,214,0.5)',
    },
    avatarCircle: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarDisconnected: { backgroundColor: C.white, borderColor: C.surfaceLight },
    avatarText: { color: C.primaryDark, fontSize: 18, fontWeight: '800' },
    profileName: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,1)', letterSpacing: -0.2 },
    profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    quotaPill: {
        borderRadius: 9999, backgroundColor: C.accentLight,
        paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    quotaAmount: { fontSize: 20, fontWeight: '800', color: C.accent, lineHeight: 24 },
    quotaLabel: { fontSize: 10, fontWeight: '600', color: C.accent, letterSpacing: 0.3 },
    profileCardBottom: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
    connectedText: { fontSize: 12, color: C.accent, fontWeight: '500' },

    connectedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e8f5e9',
    },
    connectedBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
    connectedBadgeText: { fontSize: 12, fontWeight: '600', color: '#1b5e20' },

    addCreditsBtn: {
        borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6, minWidth: 60, alignItems: 'center',
        backgroundColor: 'rgba(176,236,112,0.2)', borderWidth: 1, borderColor: 'rgba(176,236,112,0.35)',
    },
    addCreditsText: { fontSize: 12, fontWeight: '700', color: C.accent },

    googleSignInRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 16, gap: 12,
    },
    googleIconBox: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
    googleIconText: { color: C.white, fontSize: 14, fontWeight: '800' },
    googleSignInText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.textPrimary },

    // Sign out — standalone bottom button, not "danger zone"
    signOutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 16, paddingVertical: 15,
        borderRadius: 14, borderWidth: 1, borderColor: C.surfaceLight,
        backgroundColor: C.white,
        shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    signOutBtnText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
});
