import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from '../components/Toast';
import { getAuthState } from '../services/googleAuth';
import { getUserRole } from '../services/storage';
import { ThemeProvider, useTheme } from '../constants/theme';

// Routes that don't require auth
const PUBLIC_ROUTES = ['landing', 'setup', 'role-select'];

// Tab routes — treated as authenticated entry points
const TAB_ROUTES = ['(tabs)', 'search', 'send', 'profile'];

function AppContent() {
    const [checking, setChecking] = useState(true);
    const { theme } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        (async () => {
            try {
                const { isSignedIn } = await getAuthState();
                const currentRoute = segments[0];
                const onPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

                if (!isSignedIn) {
                    if (!onPublicRoute) router.replace('/landing');
                    return;
                }

                // Signed in — check role
                const role = await getUserRole();
                if (!role && currentRoute !== 'role-select') {
                    router.replace('/role-select');
                }
            } catch { }
            finally { setChecking(false); }
        })();
    }, []);

    if (checking) {
        return (
            <View style={[styles.loading, { backgroundColor: theme.bg }]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <StatusBar style={theme.statusBar} />
            </View>
        );
    }

    return (
        <>
            <StatusBar style={theme.statusBar} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: theme.bg },
                    // §7.3 — Forward navigation: slide in from right, 350ms
                    animation: 'slide_from_right',
                    animationDuration: 350,
                }}
            >
                {/* Landing uses full-screen dark bg — no animation flash */}
                <Stack.Screen name="landing" options={{ animation: 'fade', animationDuration: 300 }} />
                <Stack.Screen name="role-select" />
                <Stack.Screen name="index" options={{ animation: 'none' }} />
                {/* §7.3 — Tab switch: crossfade, no directional slide */}
                <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: 200 }} />
                <Stack.Screen name="setup" />
                {/* Templates screen — pushed from Profile */}
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

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
