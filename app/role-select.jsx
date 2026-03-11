import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { USER_ROLES } from '../services/storage';
import { saveUserRoleToFirestore } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

export default function RoleSelectScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const [selectedId, setSelectedId] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            // Sync with Firebase if user is logged in
            if (auth.currentUser) {
                await saveUserRoleToFirestore(auth.currentUser.uid, selectedId);
            }
            
            const role = USER_ROLES.find((r) => r.id === selectedId);
            showToast('success', 'Profile Set', `You are set up as: ${role.label}`);
            router.replace('/');
        } catch {
            showToast('error', 'Error', 'Could not save your profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={theme.statusBar} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.text }]}>What brings you here?</Text>
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                        We use this to find the most relevant contacts for your outreach.
                        You can change it anytime in Settings.
                    </Text>
                </View>

                <View style={styles.roleList}>
                    {USER_ROLES.map((role) => {
                        const isSelected = selectedId === role.id;
                        return (
                            <TouchableOpacity
                                key={role.id}
                                style={[
                                    styles.roleCard,
                                    {
                                        backgroundColor: theme.card,
                                        borderColor: isSelected ? theme.accent : theme.cardBorder,
                                        borderWidth: isSelected ? 2 : 1,
                                    },
                                ]}
                                onPress={() => setSelectedId(role.id)}
                                activeOpacity={0.8}
                            >
                                <View style={[
                                    styles.roleIconWrap,
                                    { backgroundColor: isSelected ? theme.accentLight : theme.bgTertiary },
                                ]}>
                                    <Text style={styles.roleIcon}>{role.icon}</Text>
                                </View>
                                <View style={styles.roleInfo}>
                                    <Text style={[styles.roleLabel, { color: theme.text }]}>{role.label}</Text>
                                    <Text style={[styles.roleDesc, { color: theme.textMuted }]}>{role.description}</Text>
                                </View>
                                <View style={[
                                    styles.radioOuter,
                                    { borderColor: isSelected ? theme.accent : theme.border },
                                ]}>
                                    {isSelected && (
                                        <View style={[styles.radioInner, { backgroundColor: theme.accent }]} />
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
                <TouchableOpacity
                    style={[
                        styles.confirmBtn,
                        { backgroundColor: theme.accent },
                        (!selectedId || saving) && { opacity: 0.45 },
                    ]}
                    onPress={handleConfirm}
                    disabled={!selectedId || saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.confirmBtnText}>Continue →</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 56 : 20,
        paddingBottom: 24,
    },
    header: { marginBottom: 28 },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, marginBottom: 8 },
    subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    roleList: { gap: 10 },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 14,
        gap: 12,
    },
    roleIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleIcon: { fontSize: 22 },
    roleInfo: { flex: 1 },
    roleLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    roleDesc: { fontSize: 12, lineHeight: 16 },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    confirmBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
