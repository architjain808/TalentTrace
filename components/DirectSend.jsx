import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../constants/theme';

export default function DirectSend({ onSend }) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        toEmail: '',
        toName: '',
        company: '',
        role: ''
    });

    const handleSend = async () => {
        const { toEmail, company } = formData;
        if (!toEmail.trim() || !company.trim()) {
            return;
        }

        setLoading(true);
        try {
            await onSend(formData);
            setFormData({ toEmail: '', toName: '', company: '', role: '' });
        } catch (error) {
            // Error is handled by upper level which shows a toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Direct Email Send</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Already know the HR contact? Send an email directly without searching.
                </Text>
            </View>

            <View style={[styles.form, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Email Address *</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="hr@company.com"
                        placeholderTextColor={theme.textMuted}
                        value={formData.toEmail}
                        onChangeText={(text) => setFormData({ ...formData, toEmail: text })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Contact Name</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={theme.textMuted}
                        value={formData.toName}
                        onChangeText={(text) => setFormData({ ...formData, toName: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Company *</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Acme Corp"
                        placeholderTextColor={theme.textMuted}
                        value={formData.company}
                        onChangeText={(text) => setFormData({ ...formData, company: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Role</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. Talent Acquisition"
                        placeholderTextColor={theme.textMuted}
                        value={formData.role}
                        onChangeText={(text) => setFormData({ ...formData, role: text })}
                        autoCapitalize="words"
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: theme.accent }, (!formData.toEmail.trim() || !formData.company.trim() || loading) && { opacity: 0.5 }]}
                    onPress={handleSend}
                    disabled={!formData.toEmail.trim() || !formData.company.trim() || loading}
                    activeOpacity={0.8}
                >
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text style={styles.sendBtnText}>Send Email</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 10 },
    header: { marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
    subtitle: { fontSize: 15, lineHeight: 22 },
    form: { padding: 16, borderRadius: 14, borderWidth: 1 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
    sendBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
