import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Toast from '../components/Toast';
import { areKeysConfigured } from '../services/storage';
import { ThemeProvider, useTheme } from '../constants/theme';

function AppContent() {
    const [checking, setChecking] = useState(true);
    const { theme, isDark } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        (async () => {
            try {
                const configured = await areKeysConfigured();
                if (!configured && segments[0] !== 'setup') {
                    router.replace('/setup');
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
