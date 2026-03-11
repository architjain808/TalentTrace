/**
 * EmailCard — Contact card with send flow
 * Design system: white card, 16px radius, lime CTA, no teal/emoji
 */
import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Linking,
} from 'react-native';
import { Mail, Linkedin, Phone, AlertCircle, ExternalLink } from 'lucide-react-native';
import TemplatePicker from './TemplatePicker';
import EmailEditor from './EmailEditor';

const C = {
    primaryDark:  '#144516',
    primary:      '#416943',
    accent:       '#B0EC70',
    accentLight:  'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    success:      '#4CAF50',
    successBg:    '#E8F5E9',
    warning:      '#F9AB00',
    warningBg:    '#FEF9E7',
    danger:       '#E53935',
    dangerBg:     '#FFEBEE',
};

// Confidence dot indicator (colored geometric dot — no emoji per §4.3)
const CONFIDENCE = {
    high:   { color: C.success,  bg: C.successBg, label: 'High' },
    medium: { color: C.warning,  bg: C.warningBg, label: 'Med'  },
    low:    { color: C.danger,   bg: C.dangerBg,  label: 'Low'  },
};

export default function EmailCard({ contact, onSend, company }) {
    const [sending, setSending]       = useState(false);
    const [sent, setSent]             = useState(false);
    const [sendError, setSendError]   = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [subject, setSubject]       = useState('');
    const [body, setBody]             = useState('');

    const contactData = { name: contact.name, company, role: contact.role, email: contact.email };
    const confidence  = CONFIDENCE[contact.confidence] || CONFIDENCE.medium;
    const isInvalid   = contact.validation && !contact.validation.valid;
    const hasLinkedin = contact.linkedin && contact.linkedin !== 'null';
    const hasPhone    = contact.phone    && contact.phone    !== 'null';

    // Initials from name
    const initials = contact.name
        ? contact.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : '?';

    const handleSendPress = () => { setSendError(null); setShowPicker(true); };
    const handleTemplateSelect = (template) => { setSubject(template.subject); setBody(template.body); setShowPicker(false); setShowEditor(true); };
    const handleBlank = () => { setSubject(''); setBody(''); setShowPicker(false); setShowEditor(true); };

    const handleFinalSend = async () => {
        if (!subject.trim() || !body.trim()) return;
        setSending(true);
        setSendError(null);
        try {
            await onSend({ toEmail: contact.email, toName: contact.name, company, role: contact.role, subject, body });
            setSent(true);
            setShowEditor(false);
        } catch (err) {
            setSendError(err.message || 'Send failed');
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={[styles.card, isInvalid && styles.cardInvalid]}>
            {/* ── Contact header ─────────────────────────────────────── */}
            <View style={styles.header}>
                {/* §12.2 — Avatar: circle with initials */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.contactInfo}>
                    <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
                    <Text style={styles.contactRole} numberOfLines={1}>{contact.role}</Text>
                </View>
                {/* Confidence badge — colored dot + label (§4.3 no emoji) */}
                <View style={[styles.confidenceBadge, { backgroundColor: confidence.bg }]}>
                    <View style={[styles.confidenceDot, { backgroundColor: confidence.color }]} />
                    <Text style={[styles.confidenceLabel, { color: confidence.color }]}>
                        {confidence.label}
                    </Text>
                </View>
            </View>

            {/* ── Email row ──────────────────────────────────────────── */}
            <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: C.surfaceLight }]}>
                    <Mail size={14} color={C.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emailText} numberOfLines={1}>
                    {contact.email || 'No email found'}
                </Text>
            </View>

            {/* ── Validation warning ─────────────────────────────────── */}
            {isInvalid && (
                <View style={styles.warningRow}>
                    <AlertCircle size={14} color={C.warning} strokeWidth={1.5} />
                    <Text style={styles.warningText} numberOfLines={2}>
                        {contact.validation.reason}
                    </Text>
                </View>
            )}

            {/* ── LinkedIn row ───────────────────────────────────────── */}
            {hasLinkedin && (
                <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(contact.linkedin)}
                    activeOpacity={0.7}
                    accessibilityLabel="Open LinkedIn profile"
                >
                    <View style={[styles.detailIcon, { backgroundColor: '#E8F0FE' }]}>
                        <Linkedin size={14} color="#0077b5" strokeWidth={1.5} />
                    </View>
                    <Text style={styles.linkedinText} numberOfLines={1}>
                        {contact.linkedin
                            .replace('https://www.linkedin.com/in/', '')
                            .replace('https://linkedin.com/in/', '')
                            .replace(/\/$/, '') || 'LinkedIn Profile'}
                    </Text>
                    <ExternalLink size={13} color={C.textSecondary} strokeWidth={1.5} />
                </TouchableOpacity>
            )}

            {/* ── Phone row ──────────────────────────────────────────── */}
            {hasPhone && (
                <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(`tel:${contact.phone}`)}
                    activeOpacity={0.7}
                    accessibilityLabel="Call phone number"
                >
                    <View style={[styles.detailIcon, { backgroundColor: C.surfaceLight }]}>
                        <Phone size={14} color={C.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.emailText} numberOfLines={1}>{contact.phone}</Text>
                    <ExternalLink size={13} color={C.textSecondary} strokeWidth={1.5} />
                </TouchableOpacity>
            )}

            {/* ── Send error ─────────────────────────────────────────── */}
            {sendError && (
                <View style={styles.errorRow}>
                    <Text style={styles.errorText}>{sendError}</Text>
                </View>
            )}

            {/* ── Inline email editor ─────────────────────────────────── */}
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

            {/* ── CTA button ─────────────────────────────────────────── */}
            <TouchableOpacity
                style={[
                    styles.sendBtn,
                    sent && styles.sendBtnSent,
                    (isInvalid && !showEditor) && styles.sendBtnInvalid,
                ]}
                onPress={showEditor ? handleFinalSend : handleSendPress}
                disabled={sending || sent || !contact.email}
                activeOpacity={0.85}
                accessibilityLabel={sent ? 'Email sent' : showEditor ? 'Send email now' : 'Send email'}
            >
                {sending ? (
                    <ActivityIndicator size="small" color={C.primaryDark} />
                ) : (
                    <Text style={[styles.sendBtnText, sent && styles.sendBtnTextSent]}>
                        {sent ? 'Sent' : showEditor ? 'Send Now' : isInvalid ? 'Send Anyway' : 'Send Email'}
                    </Text>
                )}
            </TouchableOpacity>

            {showEditor && (
                <TouchableOpacity style={styles.cancelLink} onPress={() => setShowEditor(false)} activeOpacity={0.7}>
                    <Text style={styles.cancelLinkText}>Cancel</Text>
                </TouchableOpacity>
            )}

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
    // §6.2 — Card: 16px radius, white bg, primary shadow
    card: {
        borderRadius: 16,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.surfaceLight,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    cardInvalid: { opacity: 0.75 },

    // §5.3 — Contact header row
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: C.primaryDark,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: C.surfaceLight,
    },
    avatarText: { color: C.accent, fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 15, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
    contactRole: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

    // Confidence badge
    confidenceBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 9999, gap: 5,
    },
    confidenceDot: { width: 6, height: 6, borderRadius: 3 },
    confidenceLabel: { fontSize: 11, fontWeight: '700' },

    // Detail rows (email, linkedin, phone)
    detailRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surfaceLight,
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
        marginBottom: 8, gap: 10,
    },
    detailIcon: {
        width: 26, height: 26, borderRadius: 7,
        alignItems: 'center', justifyContent: 'center',
    },
    emailText:    { flex: 1, fontSize: 13, fontWeight: '500', color: C.textPrimary },
    linkedinText: { flex: 1, fontSize: 13, fontWeight: '500', color: '#0077b5' },

    // Warning row
    warningRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.warningBg,
        borderRadius: 10, borderWidth: 1, borderColor: `${C.warning}40`,
        paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, gap: 8,
    },
    warningText: { flex: 1, fontSize: 12, color: '#7d5a00', lineHeight: 16 },

    // Error row
    errorRow: {
        backgroundColor: C.dangerBg, borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
    },
    errorText: { fontSize: 12, color: C.danger },

    // Editor section
    editorSection: {
        borderTopWidth: 1, borderTopColor: C.surfaceLight,
        paddingTop: 14, marginTop: 4, marginBottom: 8,
    },

    // §6.1 — Primary CTA: lime pill
    sendBtn: {
        borderRadius: 9999, paddingVertical: 13,
        alignItems: 'center', justifyContent: 'center', marginTop: 4,
        backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },
    sendBtnSent: {
        backgroundColor: C.successBg,
        shadowColor: C.success, shadowOpacity: 0.2,
    },
    sendBtnInvalid: {
        backgroundColor: C.surfaceLight, shadowOpacity: 0,
    },
    sendBtnText:     { fontSize: 14, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.2 },
    sendBtnTextSent: { color: C.success },

    cancelLink: { alignItems: 'center', paddingVertical: 10 },
    cancelLinkText: { fontSize: 13, fontWeight: '500', color: C.textSecondary },
});
