/**
 * Profile Screen — Account, outreach profile, and settings
 * Light mode only. Templates → separate /templates page.
 * Safe area insets for proper Android top spacing.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    ActivityIndicator,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Animated,
    Easing,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, LogOut, User, Zap, FileText, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { loadSettings, saveSettings, USER_ROLES, getRoleById } from '../../services/storage';
import {
    signInWithGoogle, getAuthState, signOut as googleSignOut, isGoogleAuthConfigured,
} from '../../services/googleAuth';
import { getUserProfile, updateQuotaBalance, saveUserRoleToFirestore } from '../../firebase/userCRUD';
import { auth } from '../../firebase/config';
import { showToast } from '../../components/Toast';

const C = {
    primaryDark:  '#144516',
    primary:      '#416943',
    primaryMid:   '#2D5A30',
    accent:       '#B0EC70',
    accentLight:  'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    success:      '#4CAF50',
    danger:       '#E53935',
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

// Role picker bottom sheet modal
function RolePickerModal({ visible, currentRoleId, onSelect, onClose }) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={modalStyles.sheet}>
                <View style={modalStyles.handle} />
                <Text style={modalStyles.title}>Select Outreach Goal</Text>
                <Text style={modalStyles.subtitle}>Shapes which HR contacts we prioritize for you</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {USER_ROLES.map((role, i) => {
                        const isActive = currentRoleId === role.id;
                        return (
                            <TouchableOpacity
                                key={role.id}
                                style={[
                                    modalStyles.roleRow,
                                    i === USER_ROLES.length - 1 && { borderBottomWidth: 0 },
                                    isActive && { backgroundColor: C.accentLight },
                                ]}
                                onPress={() => onSelect(role)}
                                activeOpacity={0.7}
                            >
                                <Text style={modalStyles.roleIcon}>{role.icon}</Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={modalStyles.roleLabel}>{role.label}</Text>
                                    <Text style={modalStyles.roleDesc}>{role.description}</Text>
                                </View>
                                {isActive && (
                                    <CheckCircle size={20} color={C.primary} strokeWidth={2} fill={C.accent} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
    const router  = useRouter();
    const insets  = useSafeAreaInsets();

    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);
    const [signingIn, setSigningIn]     = useState(false);
    const [addingQuota, setAddingQuota] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);

    const [googleState, setGoogleState] = useState({ isSignedIn: false, userEmail: null, userName: null });
    const [quotaBalance, setQuotaBalance] = useState(0);
    const [currentRole, setCurrentRole]   = useState(null);
    const [modelName, setModelName]       = useState('google/gemini-2.5-flash-lite');

    // Card entrance animation
    const cardAnim = useRef(new Animated.Value(0)).current;
    const cardY    = useRef(new Animated.Value(-20)).current;

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
                    if (profile.role) setCurrentRole(getRoleById(profile.role));
                }
            }
            setLoading(false);
            Animated.parallel([
                Animated.timing(cardAnim, { toValue: 1, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
                Animated.timing(cardY,    { toValue: 0, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
            ]).start();
        })();
    }, []);

    const handleRoleChange = async (role) => {
        if (auth.currentUser) {
            try { await saveUserRoleToFirestore(auth.currentUser.uid, role.id); }
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

    const handleSaveModel = async () => {
        setSaving(true);
        try {
            const current = await loadSettings();
            await saveSettings({ ...current, openrouterModel: modelName.trim() || 'google/gemini-2.5-flash-lite' });
            showToast('success', 'Saved', 'AI model updated.');
        } catch { showToast('error', 'Error', 'Failed to save.'); }
        finally { setSaving(false); }
    };

    const handleAddQuota = async () => {
        if (!auth.currentUser) return;
        setAddingQuota(true);
        try {
            await updateQuotaBalance(auth.currentUser.uid, 10);
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile) setQuotaBalance(profile.quotaBalance || 0);
            showToast('success', 'Quota Added', 'Added 10 credits.');
        } catch { showToast('error', 'Error', 'Failed to add quota.'); }
        finally { setAddingQuota(false); }
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

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
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
                                <View style={styles.connectedRow}>
                                    <View style={styles.connectedDot} />
                                    <Text style={styles.connectedText}>Connected to Gmail</Text>
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
                            <>
                                <SettingRow
                                    label="Gmail"
                                    value={googleState.userEmail}
                                    icon={User}
                                    rightNode={
                                        <View style={styles.connectedBadge}>
                                            <View style={styles.connectedBadgeDot} />
                                            <Text style={styles.connectedBadgeText}>Connected</Text>
                                        </View>
                                    }
                                />
                                <SettingRow
                                    label="Search Credits"
                                    icon={Zap}
                                    rightNode={
                                        <View style={styles.quotaRight}>
                                            <Text style={styles.quotaRightNum}>{quotaBalance}</Text>
                                            <TouchableOpacity
                                                style={styles.addCreditsBtn}
                                                onPress={handleAddQuota}
                                                disabled={addingQuota}
                                                activeOpacity={0.7}
                                                accessibilityLabel="Add 10 credits"
                                            >
                                                {addingQuota
                                                    ? <ActivityIndicator size="small" color={C.primaryDark} />
                                                    : <Text style={styles.addCreditsText}>+ Add</Text>
                                                }
                                            </TouchableOpacity>
                                        </View>
                                    }
                                    last
                                />
                            </>
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

                    {/* ── AI Configuration ── */}
                    <SectionHeader label="AI Configuration" />
                    <Card>
                        <View style={styles.aiModelWrap}>
                            <Text style={styles.aiLabel}>OpenRouter Model</Text>
                            <Text style={styles.aiDesc}>Model used for HR contact extraction</Text>
                            <View style={styles.aiInputRow}>
                                <TextInput
                                    style={styles.aiInput}
                                    value={modelName}
                                    onChangeText={setModelName}
                                    placeholder="google/gemini-2.5-flash-lite"
                                    placeholderTextColor={C.textSecondary}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    accessibilityLabel="AI model name"
                                />
                                <TouchableOpacity
                                    style={[styles.aiSaveBtn, saving && { opacity: 0.6 }]}
                                    onPress={handleSaveModel}
                                    disabled={saving}
                                    activeOpacity={0.8}
                                >
                                    {saving
                                        ? <ActivityIndicator size="small" color={C.primaryDark} />
                                        : <Text style={styles.aiSaveBtnText}>Save</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Card>

                    {/* ── Danger Zone ── */}
                    {googleState.isSignedIn && (
                        <>
                            <SectionHeader label="Danger Zone" />
                            <Card>
                                <SettingRow
                                    label="Sign Out"
                                    icon={LogOut}
                                    danger
                                    onPress={handleSignOut}
                                    last
                                    rightNode={null}
                                />
                            </Card>
                        </>
                    )}

                    <View style={{ height: 24 }} />
                </ScrollView>
            </KeyboardAvoidingView>

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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 48 : 28, maxHeight: '78%',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 24,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.surfaceLight, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
    title:    { fontSize: 18, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.3 },
    subtitle: { fontSize: 13, marginTop: 4, marginBottom: 4, color: C.textSecondary },
    roleRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.surfaceLight,
        gap: 12, borderRadius: 8,
    },
    roleIcon:  { fontSize: 22 },
    roleLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary },
    roleDesc:  { fontSize: 12, marginTop: 2, color: C.textSecondary },
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
    profileName:  { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,1)', letterSpacing: -0.2 },
    profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    quotaPill: {
        borderRadius: 9999, backgroundColor: C.accentLight,
        paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    quotaAmount: { fontSize: 20, fontWeight: '800', color: C.accent, lineHeight: 24 },
    quotaLabel:  { fontSize: 10, fontWeight: '600', color: C.accent, letterSpacing: 0.3 },
    connectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    connectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
    connectedText: { fontSize: 12, color: C.accent, fontWeight: '500' },

    connectedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e8f5e9',
    },
    connectedBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success },
    connectedBadgeText: { fontSize: 12, fontWeight: '600', color: '#1b5e20' },

    quotaRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    quotaRightNum: { fontSize: 17, fontWeight: '700', color: C.primaryDark },
    addCreditsBtn: {
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, minWidth: 52, alignItems: 'center',
        backgroundColor: C.accentLight, borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    addCreditsText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },

    googleSignInRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 16, gap: 12,
    },
    googleIconBox: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
    googleIconText: { color: C.white, fontSize: 14, fontWeight: '800' },
    googleSignInText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.textPrimary },

    aiModelWrap: { padding: 16, gap: 4 },
    aiLabel: { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginBottom: 2 },
    aiDesc:  { fontSize: 12, color: C.textSecondary, marginBottom: 10 },
    aiInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    aiInput: {
        flex: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
        fontSize: 13, color: C.textPrimary, backgroundColor: C.surfaceLight,
    },
    aiSaveBtn: {
        borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 10,
        alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    aiSaveBtnText: { color: C.primaryDark, fontSize: 13, fontWeight: '700' },
});
