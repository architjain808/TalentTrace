import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useTheme } from '../constants/theme';
import TemplatePicker from './TemplatePicker';
import EmailEditor from './EmailEditor';

const CONFIDENCE_CONFIG = {
    high: { emoji: '🟢', label: 'High', desc: 'Email found in search results' },
    medium: { emoji: '🟡', label: 'Medium', desc: 'Pattern-matched, domain verified' },
    low: { emoji: '🔴', label: 'Low', desc: 'Guessed, may not exist' },
};

export default function EmailCard({ contact, onSend, company }) {
    const { theme } = useTheme();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [sendError, setSendError] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const contactData = {
        name: contact.name,
        company: company,
        role: contact.role,
        email: contact.email,
    };

    const handleSendPress = () => {
        setSendError(null);
        setShowPicker(true);
    };

    const handleTemplateSelect = (template) => {
        setSubject(template.subject);
        setBody(template.body);
        setShowPicker(false);
        setShowEditor(true);
    };

    const handleBlank = () => {
        setSubject('');
        setBody('');
        setShowPicker(false);
        setShowEditor(true);
    };

    const handleFinalSend = async () => {
        if (!subject.trim() || !body.trim()) return;
        setSending(true);
        setSendError(null);
        try {
            await onSend({
                toEmail: contact.email,
                toName: contact.name,
                company,
                role: contact.role,
                subject,
                body,
            });
            setSent(true);
            setShowEditor(false);
        } catch (err) {
            setSendError(err.message || 'Send failed');
        } finally {
            setSending(false);
        }
    };

    const hasLinkedin = contact.linkedin && contact.linkedin !== 'null';
    const hasPhone = contact.phone && contact.phone !== 'null';
    const confidence = CONFIDENCE_CONFIG[contact.confidence] || CONFIDENCE_CONFIG.medium;
    const isInvalid = contact.validation && !contact.validation.valid;

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder },
        isInvalid && styles.invalidCard]}>
            <View style={styles.header}>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: theme.text }]}>{contact.name}</Text>
                    <Text style={[styles.role, { color: theme.textSecondary }]}>{contact.role}</Text>
                </View>
                {/* Confidence Badge */}
                <View style={[styles.badge, {
                    backgroundColor: contact.confidence === 'high' ? '#e8f5e9'
                        : contact.confidence === 'low' ? '#fbe9e7' : '#fff8e1'
                }]}>
                    <Text style={styles.badgeEmoji}>{confidence.emoji}</Text>
                    <Text style={[styles.badgeText, {
                        color: contact.confidence === 'high' ? '#2e7d32'
                            : contact.confidence === 'low' ? '#c62828' : '#f57f17'
                    }]}>{confidence.label}</Text>
                </View>
            </View>

            <View style={[styles.detailRow, { backgroundColor: theme.bgTertiary }]}>
                <Text style={styles.detailIcon}>📧</Text>
                <Text style={[styles.detailText, { color: theme.accent }]} numberOfLines={1}>{contact.email || 'No email found'}</Text>
            </View>

            {/* Validation warning */}
            {isInvalid && (
                <View style={[styles.warningRow, { backgroundColor: '#fff3e0' }]}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>{contact.validation.reason}</Text>
                </View>
            )}

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

            {/* Inline Email Editor (visible after template selection) */}
            {showEditor && (
                <View style={styles.editorSection}>
                    <EmailEditor
                        mode="compose"
                        initialSubject={subject}
                        initialBody={body}
                        contactData={contactData}
                        onSubjectChange={setSubject}
                        onBodyChange={setBody}
                    />
                </View>
            )}

            {/* Send / Confirm Button */}
            <TouchableOpacity
                style={[
                    styles.sendBtn,
                    { backgroundColor: theme.accent },
                    sent && { backgroundColor: theme.success },
                    isInvalid && !showEditor && { backgroundColor: theme.textMuted, opacity: 0.6 },
                ]}
                onPress={showEditor ? handleFinalSend : handleSendPress}
                disabled={sending || sent || !contact.email}
                activeOpacity={0.8}
            >
                {sending ? (
                    <View style={styles.sendingRow}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.sendBtnText}>  Sending...</Text>
                    </View>
                ) : (
                    <Text style={styles.sendBtnText}>
                        {sent ? '✓ Sent' : showEditor ? '📨 Send Now' : isInvalid ? '⚠ Send Anyway' : '📧 Send Email'}
                    </Text>
                )}
            </TouchableOpacity>

            {showEditor && (
                <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowEditor(false)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.cancelText, { color: theme.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
            )}

            {/* Template Picker Modal */}
            <TemplatePicker
                visible={showPicker}
                onSelect={handleTemplateSelect}
                onBlank={handleBlank}
                onClose={() => setShowPicker(false)}
                contactData={contactData}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    invalidCard: { opacity: 0.75 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    info: { flex: 1, marginRight: 8 },
    name: { fontSize: 16, fontWeight: '600', marginBottom: 1 },
    role: { fontSize: 13, fontWeight: '500' },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 },
    badgeEmoji: { fontSize: 10 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    detailRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 6, gap: 8 },
    detailIcon: { fontSize: 13 },
    detailText: { fontSize: 13, fontWeight: '500', flex: 1 },
    openLink: { fontSize: 11, fontWeight: '600' },
    warningRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 6, gap: 6 },
    warningIcon: { fontSize: 12 },
    warningText: { fontSize: 12, color: '#e65100', flex: 1 },
    errorRow: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
    errorText: { fontSize: 12 },
    editorSection: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0', paddingTop: 10, marginTop: 4, marginBottom: 4 },
    sendBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    sendingRow: { flexDirection: 'row', alignItems: 'center' },
    sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    cancelBtn: { alignItems: 'center', paddingVertical: 6 },
    cancelText: { fontSize: 13, fontWeight: '500' },
});
