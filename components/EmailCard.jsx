import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useTheme } from '../constants/theme';

export default function EmailCard({ contact, onSend, company }) {
    const { theme } = useTheme();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState(null);

    const handleSend = async () => {
        setSending(true);
        setSendError(null);
        try {
            await onSend({
                toEmail: contact.email,
                toName: contact.name,
                company,
                role: contact.role,
            });
            setSent(true);
        } catch (err) {
            setSendError(err.message || 'Send failed');
        } finally {
            setSending(false);
        }
    };

    const hasLinkedin = contact.linkedin && contact.linkedin !== 'null';
    const hasPhone = contact.phone && contact.phone !== 'null';

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.header}>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>{contact.name}</Text>
                    <Text style={[styles.role, { color: theme.textSecondary }]}>{contact.role}</Text>
                </View>
            </View>

            <View style={[styles.detailRow, { backgroundColor: theme.bgTertiary }]}>
                <Text style={styles.detailIcon}>📧</Text>
                <Text style={[styles.detailText, { color: theme.accent }]} numberOfLines={1}>{contact.email}</Text>
            </View>

            {hasLinkedin && (
                <TouchableOpacity
                    style={[styles.detailRow, { backgroundColor: theme.bgTertiary }]}
                    onPress={() => Linking.openURL(contact.linkedin)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.detailIcon}>🔗</Text>
                    <Text style={[styles.detailText, { color: '#0077b5' }]} numberOfLines={1}>
                        {contact.linkedin.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '') || 'LinkedIn Profile'}
                    </Text>
                    <Text style={[styles.openLink, { color: theme.textMuted }]}>Open ↗</Text>
                </TouchableOpacity>
            )}

            {hasPhone && (
                <TouchableOpacity
                    style={[styles.detailRow, { backgroundColor: theme.bgTertiary }]}
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.detailIcon}>📱</Text>
                    <Text style={[styles.detailText, { color: theme.text }]}>{contact.phone}</Text>
                    <Text style={[styles.openLink, { color: theme.textMuted }]}>Call ↗</Text>
                </TouchableOpacity>
            )}

            {sendError && (
                <View style={[styles.errorRow, { backgroundColor: theme.errorBg }]}>
                    <Text style={[styles.errorText, { color: theme.error }]}>{sendError}</Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.sendBtn,
                    { backgroundColor: theme.accent },
                    sent && { backgroundColor: theme.success },
                ]}
                onPress={handleSend}
                disabled={sending || sent}
                activeOpacity={0.8}
            >
                {sending ? (
                    <View style={styles.sendingRow}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.sendBtnText}>  Sending...</Text>
                    </View>
                ) : (
                    <Text style={styles.sendBtnText}>
                        {sent ? '✓ Sent' : 'Send Email'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    info: { flex: 1, marginRight: 8 },
    name: { fontSize: 16, fontWeight: '600', marginBottom: 1 },
    role: { fontSize: 13, fontWeight: '500' },
    detailRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 6, gap: 8 },
    detailIcon: { fontSize: 13 },
    detailText: { fontSize: 13, fontWeight: '500', flex: 1 },
    openLink: { fontSize: 11, fontWeight: '600' },
    errorRow: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
    errorText: { fontSize: 12 },
    sendBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    sendingRow: { flexDirection: 'row', alignItems: 'center' },
    sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

