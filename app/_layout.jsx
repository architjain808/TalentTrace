import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from '../components/Toast';
import { getAuthState } from '../services/googleAuth';
import { getUserRole } from '../services/storage';
import { ThemeProvider, useTheme } from '../constants/theme';

// Routes that don't require auth or a role to be set
const PUBLIC_ROUTES = ['landing', 'setup', 'role-select'];

function AppContent() {
    const [checking, setChecking] = useState(true);
    const { theme } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        (async () => {
            try {
                const { isSignedIn } = await getAuthState();
                const onPublicRoute = PUBLIC_ROUTES.includes(segments[0]);

                if (!isSignedIn) {
                    if (!onPublicRoute) router.replace('/landing');
                    return;
                }

                // Signed in — check if role has been selected
                const role = await getUserRole();
                if (!role && segments[0] !== 'role-select') {
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
                    animation: 'fade',
                }}
            >
                <Stack.Screen name="landing" />
                <Stack.Screen name="role-select" />
                <Stack.Screen name="index" />
                <Stack.Screen name="setup" />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
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
