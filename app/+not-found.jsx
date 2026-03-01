import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';

export default function NotFoundScreen() {
    const router = useRouter();
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <Text style={styles.icon}>🚫</Text>
            <Text style={[styles.title, { color: theme.text }]}>Page Not Found</Text>
            <Text style={[styles.sub, { color: theme.textSecondary }]}>This screen doesn't exist.</Text>
            <TouchableOpacity style={[styles.btn, { backgroundColor: theme.accent }]} onPress={() => router.replace('/')} activeOpacity={0.8}>
                <Text style={styles.btnText}>Go Home</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    icon: { fontSize: 52, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
    sub: { fontSize: 15, marginBottom: 20 },
    btn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
