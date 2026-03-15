/**
 * Search Screen — UI Redesign Reference §8.2 (adapted for HR contact finder)
 * Light mode only. Proper Android status bar spacing via useSafeAreaInsets.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Animated,
    Easing,
    Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, X } from 'lucide-react-native';
import ProgressSteps from '../../components/ProgressSteps';
import ResultsTable from '../../components/ResultsTable';
import { useSearch } from '../../hooks/useSearch';
import { sendColdEmail } from '../../services/mailer';
import { showToast } from '../../components/Toast';

// §2.1 — Design system tokens (light mode only)
const C = {
    primaryDark:  '#144516',
    primary:      '#416943',
    accent:       '#B0EC70',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    danger:       '#E53935',
    dangerBg:     '#FFEBEE',
};

// §6.7 — Search input with animated focus ring
function SearchInput({ onSearch, loading }) {
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);

    const borderAnim = useRef(new Animated.Value(0)).current;

    const onFocus = () => {
        setFocused(true);
        Animated.timing(borderAnim, {
            toValue: 1, duration: 200,
            easing: Easing.out(Easing.ease), useNativeDriver: false,
        }).start();
    };
    const onBlur = () => {
        setFocused(false);
        Animated.timing(borderAnim, {
            toValue: 0, duration: 180,
            easing: Easing.in(Easing.ease), useNativeDriver: false,
        }).start();
    };

    const handleSearch = () => {
        const q = query.trim();
        if (q && !loading) onSearch(q);
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [C.surfaceLight, C.accent],
    });

    return (
        <View style={styles.searchSection}>
            <Animated.View
                style={[
                    styles.inputWrapper,
                    {
                        borderColor,
                        backgroundColor: focused ? C.white : C.surfaceLight,
                        shadowOpacity: focused ? 0.1 : 0,
                    },
                ]}
            >
                <SearchIcon
                    size={20}
                    color={focused ? C.primary : C.textSecondary}
                    strokeWidth={1.5}
                    style={{ marginLeft: 14, marginRight: 10 }}
                />
                <TextInput
                    style={[styles.searchInput, { color: C.textPrimary }]}
                    placeholder="Search a company..."
                    placeholderTextColor={C.textSecondary}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    returnKeyType="search"
                    editable={!loading}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="Company name search input"
                />
                {query.length > 0 && !loading && (
                    <TouchableOpacity
                        onPress={() => setQuery('')}
                        style={styles.clearBtn}
                        activeOpacity={0.6}
                        accessibilityLabel="Clear search"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <X size={16} color={C.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* §6.1 — Primary CTA: lime pill */}
            <TouchableOpacity
                style={[styles.searchBtn, (loading || !query.trim()) && styles.searchBtnDisabled]}
                onPress={handleSearch}
                disabled={loading || !query.trim()}
                activeOpacity={0.85}
                accessibilityLabel="Find HR contacts"
                accessibilityRole="button"
            >
                {loading
                    ? <ActivityIndicator size="small" color={C.primaryDark} />
                    : <Text style={styles.searchBtnText}>Find Contacts</Text>
                }
            </TouchableOpacity>
        </View>
    );
}

// §8.2 — Empty state with staggered entrance
function EmptyState() {
    const anims = useRef(
        Array.from({ length: 4 }, () => ({
            op: new Animated.Value(0),
            y:  new Animated.Value(10),
        }))
    ).current;

    useEffect(() => {
        Animated.stagger(70,
            anims.map(({ op, y }) =>
                Animated.parallel([
                    Animated.timing(op, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(y,  { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                ])
            )
        ).start();
    }, []);

    const capabilities = [
        { label: 'AI-targeted contact discovery',  sub: 'Finds the right people for your goal' },
        { label: 'Role-aware extraction',           sub: 'Tailored to your outreach profile' },
        { label: 'DNS-verified emails',             sub: 'Checks MX records before showing results' },
        { label: 'One-tap Gmail send',              sub: 'Reach contacts directly from the app' },
    ];

    return (
        <View style={styles.emptyWrap}>
            <View style={styles.emptyHero}>
                <View style={styles.emptyRing2} />
                <View style={styles.emptyRing1} />
                {/* logo-light: soft pale lime — suits the dark green emptyCenter circle */}
                <View style={styles.emptyCenter}>
                    <Image
                        source={require('../../assets/logo-light.png')}
                        style={{ width: 52, height: 52, borderRadius: 26 }}
                        resizeMode="cover"
                        accessibilityLabel="TalentTrace logo"
                    />
                </View>
            </View>

            <Text style={styles.emptyTitle}>Find HR contacts at any company</Text>
            <Text style={styles.emptyDesc}>
                Enter a company name above. We'll find verified HR contacts and help you reach them.
            </Text>

            <View style={styles.capabilityCard}>
                {capabilities.map((item, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.capabilityRow,
                            i < capabilities.length - 1 && styles.capabilityRowBorder,
                            { opacity: anims[i].op, transform: [{ translateY: anims[i].y }] },
                        ]}
                    >
                        <View style={styles.capabilityDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.capabilityLabel}>{item.label}</Text>
                            <Text style={styles.capabilitySub}>{item.sub}</Text>
                        </View>
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const {
        results, loading, error, currentStep, steps,
        companyName, activeRole, search, clearResults,
    } = useSearch();

    // §7.3 — Header entrance animation
    const headerAnim = useRef(new Animated.Value(0)).current;
    const headerY    = useRef(new Animated.Value(-10)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerAnim, { toValue: 1, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
            Animated.timing(headerY,    { toValue: 0, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSearch = async (company) => {
        const found = await search(company);
        if (found.length > 0) showToast('success', 'Search Complete', `Found ${found.length} HR contact(s)`);
    };

    const handleSend = async (emailData) => {
        try {
            const result = await sendColdEmail(emailData);
            showToast('success', 'Email Sent', `Sent to ${emailData.toName}`);
            return result;
        } catch (err) {
            showToast('error', 'Send Failed', err.message || 'Failed to send email.');
            throw err;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* §8.2 — Header */}
            <Animated.View
                style={[
                    styles.header,
                    { opacity: headerAnim, transform: [{ translateY: headerY }] },
                ]}
            >
                {/* logo-dark: high-contrast lime on black — suits white header bg */}
                <View style={styles.brandRow}>
                    <Image
                        source={require('../../assets/logo-dark.png')}
                        style={styles.brandLogo}
                        resizeMode="cover"
                        accessibilityLabel="TalentTrace logo"
                    />
                    <View>
                        <Text style={styles.brand}>TalentTrace</Text>
                        <Text style={styles.brandSub}>HR CONTACT FINDER</Text>
                    </View>
                </View>
                {/* No dark mode toggle — light mode only */}
            </Animated.View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <SearchInput onSearch={handleSearch} loading={loading} />

                {loading && <ProgressSteps steps={steps} currentStep={currentStep} />}

                {error && !loading && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorTitle}>Search Failed</Text>
                        <Text style={styles.errorBody}>{error}</Text>
                        <TouchableOpacity onPress={clearResults} activeOpacity={0.7} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                            <Text style={styles.dismissText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && results.length > 0 && (
                    <ResultsTable
                        results={results}
                        company={companyName}
                        onSend={handleSend}
                        roleContext={activeRole}
                    />
                )}

                {!loading && results.length === 0 && !error && currentStep < 0 && (
                    <EmptyState />
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.white },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.surfaceLight,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    brandLogo: {
        width: 36, height: 36, borderRadius: 18,
    },
    brand: {
        fontSize: 20, fontWeight: '800',
        color: C.primaryDark, letterSpacing: -0.4,
    },
    brandSub: {
        fontSize: 10, fontWeight: '700',
        letterSpacing: 1.2, color: C.textSecondary,
        marginTop: 2,
    },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

    // §6.7 — Search input
    searchSection: { marginBottom: 24 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, borderWidth: 2,
        height: 52, marginBottom: 12,
        paddingRight: 12,
        shadowColor: C.accent, shadowOffset: { width: 0, height: 0 }, shadowRadius: 8, elevation: 0,
    },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '400', paddingVertical: 0 },
    clearBtn: { padding: 4 },

    // §6.1 — Lime pill CTA
    searchBtn: {
        borderRadius: 9999, height: 52,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    searchBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    searchBtnText: { fontSize: 15, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.2 },

    // Error
    errorCard: {
        borderRadius: 12, borderWidth: 2, borderColor: C.danger,
        backgroundColor: C.dangerBg, padding: 16, marginBottom: 20,
    },
    errorTitle: { fontSize: 14, fontWeight: '700', color: C.danger, marginBottom: 4 },
    errorBody:  { fontSize: 13, lineHeight: 18, color: C.danger, opacity: 0.85 },
    dismissText:{ fontSize: 13, fontWeight: '600', color: C.danger },

    // Empty state
    emptyWrap: { alignItems: 'center', paddingTop: 32 },
    emptyHero: {
        width: 120, height: 120,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, position: 'relative',
    },
    emptyRing2: {
        position: 'absolute',
        width: 112, height: 112, borderRadius: 56,
        backgroundColor: 'rgba(176,236,112,0.08)',
    },
    emptyRing1: {
        position: 'absolute',
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: 'rgba(176,236,112,0.12)',
        borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    emptyCenter: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: C.primaryDark,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
    emptyDesc:  { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 32, paddingHorizontal: 8 },

    capabilityCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        alignSelf: 'stretch', overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    capabilityRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 16, paddingHorizontal: 16, gap: 14,
    },
    capabilityRowBorder: { borderBottomWidth: 1, borderBottomColor: C.surfaceLight },
    capabilityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primaryDark },
    capabilityLabel: { fontSize: 14, fontWeight: '600', color: C.textPrimary },
    capabilitySub:   { fontSize: 12, marginTop: 2, color: C.textSecondary },
});
