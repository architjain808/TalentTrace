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
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../hooks/useSettings';
import { loadSettings, saveSettings, USER_ROLES, getRoleById } from '../services/storage';
import { signInWithGoogle, getAuthState, signOut as googleSignOut, isGoogleAuthConfigured, getIdToken } from '../services/googleAuth';
import { getUserProfile, saveUserRoleToFirestore } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';
import { useTheme, DS } from '../constants/theme';
import { Target, Mail, FileText, Bot, ChevronRight, ShoppingCart, Zap } from 'lucide-react-native';
import EmailEditor from '../components/EmailEditor';
import { buyQuotaPack, initIAP, endIAP } from '../services/iapService';

// Quota packs — mirrors backend PRODUCTS catalogue
const QUOTA_PACKS = [
    { id: 'quota_starter_50',  name: 'Starter',  credits: 50,  price: '₹99',  tag: null,     icon: '⚡' },
    { id: 'quota_pro_150',     name: 'Pro',      credits: 150, price: '₹249', tag: 'Popular', icon: '🚀' },
    { id: 'quota_growth_500',  name: 'Growth',   credits: 500, price: '₹699', tag: null,     icon: '🌱' },
];

export default function SettingsScreen() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const { settings } = useSettings();
    const [modelName, setModelName] = useState('google/gemini-2.5-flash');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [googleState, setGoogleState] = useState({ isSignedIn: false, userEmail: null });
    const [signingIn, setSigningIn] = useState(false);
    
    // IAP State
    const [iapProducts, setIapProducts] = useState(QUOTA_PACKS); // Will be replaced by real Google Play prices

    // Quota State
    const [quotaBalance, setQuotaBalance] = useState(0);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [purchasingPack, setPurchasingPack] = useState(null); // product id being purchased

    // Role State
    const [currentRole, setCurrentRole] = useState(null);
    const [showRolePicker, setShowRolePicker] = useState(false);

    useEffect(() => {
        (async () => {
            const s = await loadSettings();
            setModelName(s.openrouterModel || 'google/gemini-2.5-flash');
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

            // Init IAP natively
            try {
                const products = await initIAP();
                if (products && products.length > 0) {
                    // map Google Play products into our local static UI shape
                    const mergedProducts = QUOTA_PACKS.map(pack => {
                        const playProduct = products.find(p => p.productId === pack.id);
                        return playProduct
                            ? { ...pack, price: playProduct.localizedPrice || pack.price }
                            : pack;
                    });
                    setIapProducts(mergedProducts);
                }
            } catch (err) {
                console.warn("Failed to initialize IAP:", err);
            }

            setLoading(false);
        })();

        return () => {
            endIAP().catch(console.warn);
        };
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
            await saveSettings({ ...currentSettings, openrouterModel: modelName.trim() || 'google/gemini-2.5-flash' });
            showToast('success', 'Settings Saved', 'Your settings have been updated.');
        } catch {
            showToast('error', 'Error', 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleBuyCredits = async (pack) => {
        if (!auth.currentUser) {
            showToast('error', 'Not signed in', 'Sign in with Google first.');
            return;
        }
        setPurchasingPack(pack.id);
        try {
            // Get Firebase ID token to authenticate with backend
            const idToken = await auth.currentUser.getIdToken();

            // Trigger Google Play Billing UI + backend verification
            const result = await buyQuotaPack(pack.id, idToken);

            // Refresh quota display
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile) setQuotaBalance(profile.quotaBalance || 0);

            setShowPlanPicker(false);
            showToast('success', '🎉 Credits Added!', result.message);
        } catch (err) {
            console.error('[IAP] Purchase failed:', err);
            // User cancelled is not an error worth showing
            if (err.code !== 'E_USER_CANCELLED') {
                showToast('error', 'Purchase Failed', err.message || 'Could not complete purchase.');
            }
        } finally {
            setPurchasingPack(null);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={theme.statusBar} />

            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Text style={[styles.backText, { color: theme.accent }]}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    {/* logo-dark on light bg, logo-light on dark bg — settings uses dynamic theme */}
                    <Image
                        source={isDark
                            ? require('../assets/logo-light.png')
                            : require('../assets/logo-dark.png')
                        }
                        style={styles.headerLogo}
                        resizeMode="cover"
                        accessibilityLabel="TalentTrace logo"
                    />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
                </View>
                <View style={{ width: 56 }} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ─── Your Profile (Role) ─── */}
                    <SectionHeader icon={<Target size={15} color={DS.accent} strokeWidth={2} />} label="Your Profile" />
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
                                                <View style={[styles.modalCheckBox, { backgroundColor: DS.primaryDark }]}>
                                                    <ChevronRight size={12} color={DS.accent} strokeWidth={3} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Modal>

                    {/* ─── Email Sending (Google) ─── */}
                    <SectionHeader icon={<Mail size={15} color={DS.accent} strokeWidth={2} />} label="Email Sending" />

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
                                        style={styles.buyCreditsBtn}
                                        onPress={() => setShowPlanPicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <ShoppingCart size={13} color="#fff" strokeWidth={2.5} />
                                        <Text style={styles.buyCreditsText}>Buy Credits</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* ─── Plan Picker Modal ─── */}
                                <Modal
                                    visible={showPlanPicker}
                                    animationType="slide"
                                    transparent
                                    onRequestClose={() => setShowPlanPicker(false)}
                                >
                                    <TouchableOpacity
                                        style={styles.modalBackdrop}
                                        activeOpacity={1}
                                        onPress={() => setShowPlanPicker(false)}
                                    />
                                    <View style={[styles.planSheet, { backgroundColor: theme.card }]}>
                                        <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
                                        <Text style={[styles.planTitle, { color: theme.text }]}>Buy Quota Credits</Text>
                                        <Text style={[styles.planSubtitle, { color: theme.textMuted }]}>
                                            Processed securely via Google Play
                                        </Text>

                                        {iapProducts.map((pack) => {
                                            const isPurchasing = purchasingPack === pack.id;
                                            return (
                                                <TouchableOpacity
                                                    key={pack.id}
                                                    style={[
                                                        styles.planCard,
                                                        { borderColor: pack.tag ? DS.accent : theme.cardBorder, backgroundColor: theme.bg },
                                                        isPurchasing && { opacity: 0.7 },
                                                    ]}
                                                    onPress={() => handleBuyCredits(pack)}
                                                    disabled={!!purchasingPack}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.planIcon}>{pack.icon}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={styles.planRow}>
                                                            <Text style={[styles.planName, { color: theme.text }]}>{pack.name}</Text>
                                                            {pack.tag && (
                                                                <View style={styles.planTag}>
                                                                    <Text style={styles.planTagText}>{pack.tag}</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <Text style={[styles.planCredits, { color: theme.textMuted }]}>
                                                            {pack.credits} searches
                                                        </Text>
                                                    </View>
                                                    {isPurchasing ? (
                                                        <ActivityIndicator size="small" color={DS.accent} />
                                                    ) : (
                                                        <Text style={[styles.planPrice, { color: DS.accent }]}>{pack.price}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}

                                        <Text style={[styles.planDisclaimer, { color: theme.textMuted }]}>
                                            Payments processed by Google Play. Prices may vary by region.
                                        </Text>
                                    </View>
                                </Modal>
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
                    <SectionHeader icon={<FileText size={15} color={DS.accent} strokeWidth={2} />} label="Email Templates" />
                    <EmailEditor mode="manage" />

                    {/* ─── AI Model ─── */}
                    <SectionHeader icon={<Bot size={15} color={DS.accent} strokeWidth={2} />} label="AI Model" style={{ marginTop: 24 }} />
                    <View style={[styles.keyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                        <View style={styles.keyHeader}>
                            <Text style={[styles.keyLabel, { color: theme.text }]}>OpenRouter Model</Text>
                        </View>
                        <Text style={[styles.keyDesc, { color: theme.textMuted }]}>Model used for contact extraction</Text>
                        <TextInput
                            style={[styles.keyInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                            value={modelName}
                            onChangeText={setModelName}
                            placeholder="google/gemini-2.5-flash"
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

// ─── Section Header component ─────────────────────────────────────────────────
function SectionHeader({ icon, label, style }) {
    const { theme } = useTheme();
    return (
        <View style={[sectionHeaderStyles.row, style]}>
            <View style={sectionHeaderStyles.iconBox}>
                {icon}
            </View>
            <Text style={[sectionHeaderStyles.label, { color: theme.text }]}>{label}</Text>
        </View>
    );
}

const sectionHeaderStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 4,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: DS.primaryDark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
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
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerLogo: { width: 28, height: 28, borderRadius: 14 },
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
    modalCheckBox: {
        width: 26,
        height: 26,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

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
    buyCreditsBtn: {
        backgroundColor: DS.accent,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
        flex: 1,
    },
    buyCreditsText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },

    // Plan Picker Modal
    planSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 44 : 28,
        paddingTop: 4,
    },
    planTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        marginTop: 10,
    },
    planSubtitle: {
        fontSize: 12,
        marginBottom: 18,
    },
    planCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        gap: 12,
    },
    planIcon: { fontSize: 22 },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planName: { fontSize: 15, fontWeight: '700' },
    planCredits: { fontSize: 12, marginTop: 2 },
    planPrice: { fontSize: 16, fontWeight: '800' },
    planTag: {
        backgroundColor: DS.accent,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
    },
    planTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    planDisclaimer: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 16,
    },
});
