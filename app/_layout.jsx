import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from '../components/Toast';
import { getAuthState } from '../services/googleAuth';
import { getUserRole } from '../services/storage';
import { ThemeProvider, useTheme } from '../constants/theme';

// Routes that don't require auth
const PUBLIC_ROUTES = ['landing', 'setup', 'role-select'];

// Minimum ms the splash is visible — ensures user always sees the logo
const SPLASH_MIN_MS = 1500;

// ─── Logo Splash ──────────────────────────────────────────────────────────────
function SplashScreen() {
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const ringAnim  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1, tension: 50, friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(ringAnim, {
                toValue: 1, duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
    const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0.35, 0] });

    return (
        <View style={splash.root}>
            <LinearGradient
                colors={['#0D2E10', '#144516', '#1A5C1F']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle bg orb */}
            <View style={splash.bgOrb} />

            {/* Logo mark */}
            <Animated.View style={[
                splash.logoWrap,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}>
                {/* Expanding ring pulse */}
                <Animated.View style={[
                    splash.ring,
                    { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                ]} />

                {/* Official app logo — light variant on dark splash bg */}
                <Image
                    source={require('../assets/logo-light.png')}
                    style={splash.logoImage}
                    resizeMode="cover"
                    accessibilityLabel="TalentTrace logo"
                />
            </Animated.View>

            {/* App name */}
            <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={splash.appName}>TalentTrace</Text>
                <Text style={splash.tagline}>Find HR contacts. Land your next job.</Text>
            </Animated.View>

            <StatusBar style="light" />
        </View>
    );
}

// ─── App routing logic ────────────────────────────────────────────────────────
function AppContent() {
    const [checking, setChecking] = useState(true);
    const { theme } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        const authCheck = async () => {
            try {
                const { isSignedIn } = await getAuthState();
                const currentRoute = segments[0];
                const onPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

                if (!isSignedIn) {
                    if (!onPublicRoute) router.replace('/landing');
                    return;
                }

                const role = await getUserRole();
                if (!role && currentRoute !== 'role-select') {
                    router.replace('/role-select');
                }
            } catch { }
        };

        // Always show splash for at least SPLASH_MIN_MS
        Promise.all([
            authCheck(),
            new Promise(resolve => setTimeout(resolve, SPLASH_MIN_MS)),
        ]).finally(() => setChecking(false));
    }, []);

    if (checking) {
        return <SplashScreen />;
    }

    return (
        <>
            <StatusBar style={theme.statusBar} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.bg },
                    animation: 'slide_from_right',
                    animationDuration: 350,
                }}
            >
                {/* Landing uses full-screen dark bg — no animation flash */}
                <Stack.Screen name="landing" options={{ animation: 'fade', animationDuration: 300 }} />
                <Stack.Screen name="role-select" />
                <Stack.Screen name="index" options={{ animation: 'none' }} />
                {/* Tab switch: crossfade, no directional slide */}
                <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 200 }} />
                <Stack.Screen name="setup" />
                <Stack.Screen name="templates" />
                <Stack.Screen name="+not-found" />
            </Stack>
            <Toast />
        </>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const splash = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D2E10',
        gap: 28,
    },
    bgOrb: {
        position: 'absolute',
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: 'rgba(176,236,112,0.05)',
        top: -60, right: -80,
    },

    // Logo mark
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        width: 140, height: 140, borderRadius: 70,
        borderWidth: 2,
        borderColor: '#B0EC70',
    },
    logoImage: {
        width: 100, height: 100, borderRadius: 50,
        shadowColor: '#B0EC70',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },

    // Text
    appName: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    tagline: {
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: 0.1,
    },
});
