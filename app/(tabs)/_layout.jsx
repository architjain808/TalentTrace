/**
 * Tab Bar Layout — Modern frosted-glass floating pill design
 * iOS: BlurView (expo-blur) with green tint overlay
 * Android: Solid premium dark green
 * Ref: UI Redesign Reference §6.5
 */
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Search, Send, User } from 'lucide-react-native';

// §2.1 — Color tokens (nav stays dark regardless of screen theme)
const C = {
    active:       '#B0EC70',              // lime accent — active icon/label
    activeGlow:   'rgba(176,236,112,0.5)',
    inactive:     'rgba(255,255,255,0.45)',
    greenTint:    'rgba(14, 38, 16, 0.88)', // dark green glass overlay
    pillBorder:   'rgba(176, 236, 112, 0.15)',
    topLine:      'rgba(176, 236, 112, 0.25)',
};

const TABS = [
    { name: 'search',  label: 'Search',  Icon: Search },
    { name: 'send',    label: 'Send',    Icon: Send   },
    { name: 'profile', label: 'Profile', Icon: User   },
];

function TabItem({ tab, focused, onPress }) {
    const { Icon } = tab;
    const color = focused ? C.active : C.inactive;

    return (
        <TouchableOpacity
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
        >
            {/* Active background pill behind icon */}
            {focused && <View style={styles.activeIconPill} />}

            {/* §4.2 — Icon: 24px Lucide, filled when active */}
            <Icon
                size={22}
                color={color}
                strokeWidth={focused ? 2 : 1.5}
                fill={focused ? C.active : 'none'}
            />

            {/* §6.5 — Label */}
            <Text style={[styles.tabLabel, { color }]}>
                {tab.label}
            </Text>

            {/* §6.5 — Active dot indicator with glow */}
            {focused && <View style={styles.activeDot} />}
        </TouchableOpacity>
    );
}

function CustomTabBar({ state, navigation }) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {/* Floating pill container */}
            <View style={styles.pill}>
                {/* Background: blur on iOS, solid on Android */}
                {Platform.OS === 'ios' ? (
                    <BlurView
                        tint="dark"
                        intensity={90}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, styles.androidBg]} />
                )}

                {/* Green tint overlay (on top of blur/solid) */}
                <View style={[StyleSheet.absoluteFill, styles.greenTint]} />

                {/* Top accent line — subtle lime border at the top of pill */}
                <View style={styles.topAccentLine} />

                {/* Tab row */}
                <View style={styles.tabRow}>
                    {TABS.map((tab, index) => (
                        <TabItem
                            key={tab.name}
                            tab={tab}
                            focused={state.index === index}
                            onPress={() => navigation.navigate(tab.name)}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tabs.Screen name="search" />
            <Tabs.Screen name="send" />
            <Tabs.Screen name="profile" />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    // Wrapper adds spacing around the pill (floating effect)
    wrapper: {
        paddingHorizontal: 16,
        paddingTop: 6,
        backgroundColor: 'transparent',
    },

    // The actual pill-shaped nav bar
    pill: {
        borderRadius: 28,          // fully rounded corners all sides
        overflow: 'hidden',        // clip blur/bg to pill shape
        height: 64,
        // Premium shadow for floating feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 24,
        // Subtle lime border
        borderWidth: 0.5,
        borderColor: C.pillBorder,
    },

    // Android fallback: deep dark green
    androidBg: {
        backgroundColor: '#0A1F0C',
    },

    // Green glass tint layer (sits on top of blur or android bg)
    greenTint: {
        backgroundColor: C.greenTint,
    },

    // Slim lime line at very top of pill — design accent
    topAccentLine: {
        position: 'absolute',
        top: 0,
        left: '15%',
        right: '15%',
        height: 1,
        backgroundColor: C.topLine,
        borderRadius: 1,
        zIndex: 1,
    },

    // Row of tab items
    tabRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },

    // Individual tab touchable
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 8,
        minHeight: 44,   // §11 — 44px touch target
        position: 'relative',
    },

    // Background pill behind active icon (highlights active tab)
    activeIconPill: {
        position: 'absolute',
        top: 6,
        width: 44,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(176, 236, 112, 0.12)',
    },

    // §6.5 — Label: 11px 500
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.1,
    },

    // §6.5 — Tiny glow dot below label for active tab
    activeDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: C.active,
        shadowColor: C.activeGlow,
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 0,
        marginTop: -2,
    },
});
