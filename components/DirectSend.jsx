/**
 * DirectSend — compose and send an email to a known contact
 * Design system: surface-light inputs, lime CTA pill, no emojis
 */
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Mail, User, Building2, Briefcase } from 'lucide-react-native';
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
    danger:       '#E53935',
};

// Single input field with icon label
function Field({ label, icon: Icon, value, onChangeText, placeholder, keyboardType, autoCapitalize, editable, required }) {
    return (
        <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
                <Icon size={14} color={C.primary} strokeWidth={1.5} />
                <Text style={styles.fieldLabel}>
                    {label}{required ? <Text style={styles.required}> *</Text> : null}
                </Text>
            </View>
            <TextInput
                style={styles.fieldInput}
                placeholder={placeholder}
                placeholderTextColor={C.textSecondary}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType || 'default'}
                autoCapitalize={autoCapitalize || 'none'}
                autoCorrect={false}
                editable={editable !== false}
            />
        </View>
    );
}

export default function DirectSend({ onSend }) {
    const [loading, setLoading]     = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [subject, setSubject]     = useState('');
    const [body, setBody]           = useState('');
    const [form, setForm]           = useState({ toEmail: '', toName: '', company: '', role: '' });

    const contactData = { name: form.toName, company: form.company, role: form.role, email: form.toEmail };
    const canProceed  = form.toEmail.trim() && form.company.trim();

    const handleSendPress = () => { if (!canProceed) return; setShowPicker(true); };
    const handleTemplateSelect = (tpl) => { setSubject(tpl.subject); setBody(tpl.body); setShowPicker(false); setShowEditor(true); };
    const handleBlank = () => { setSubject(''); setBody(''); setShowPicker(false); setShowEditor(true); };

    const handleFinalSend = async () => {
        if (!subject.trim() || !body.trim()) return;
        setLoading(true);
        try {
            await onSend({ ...form, subject, body });
            setForm({ toEmail: '', toName: '', company: '', role: '' });
            setSubject('');
            setBody('');
            setShowEditor(false);
        } catch {
            // Error handled by parent via toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Section: Recipient */}
            <Text style={styles.sectionLabel}>RECIPIENT</Text>
            <View style={styles.formCard}>
                <Field
                    label="Email Address" icon={Mail}
                    value={form.toEmail}
                    onChangeText={v => setForm({ ...form, toEmail: v })}
                    placeholder="hr@company.com"
                    keyboardType="email-address"
                    editable={!loading}
                    required
                />
                <View style={styles.fieldDivider} />
                <Field
                    label="Contact Name" icon={User}
                    value={form.toName}
                    onChangeText={v => setForm({ ...form, toName: v })}
                    placeholder="e.g. Jane Smith"
                    autoCapitalize="words"
                    editable={!loading}
                />
            </View>

            {/* Section: Context */}
            <Text style={styles.sectionLabel}>CONTEXT</Text>
            <View style={styles.formCard}>
                <Field
                    label="Company" icon={Building2}
                    value={form.company}
                    onChangeText={v => setForm({ ...form, company: v })}
                    placeholder="e.g. Acme Corp"
                    autoCapitalize="words"
                    editable={!loading}
                    required
                />
                <View style={styles.fieldDivider} />
                <Field
                    label="Their Role" icon={Briefcase}
                    value={form.role}
                    onChangeText={v => setForm({ ...form, role: v })}
                    placeholder="e.g. Talent Acquisition"
                    autoCapitalize="words"
                    editable={!loading}
                />
            </View>

            {/* Inline email editor (after template selection) */}
            {showEditor && (
                <View style={styles.editorSection}>
                    <Text style={styles.sectionLabel}>COMPOSE EMAIL</Text>
                    <View style={styles.editorCard}>
                        <EmailEditor
                            mode="compose"
                            initialSubject={subject}
                            initialBody={body}
                            contactData={contactData}
                            onSubjectChange={setSubject}
                            onBodyChange={setBody}
                        />
                    </View>
                </View>
            )}

            {/* §6.1 — Primary CTA */}
            <TouchableOpacity
                style={[styles.ctaBtn, (!canProceed || loading) && styles.ctaBtnDisabled]}
                onPress={showEditor ? handleFinalSend : handleSendPress}
                disabled={!canProceed || loading}
                activeOpacity={0.85}
                accessibilityLabel={showEditor ? 'Send email' : 'Choose template and send'}
            >
                {loading
                    ? <ActivityIndicator size="small" color={C.primaryDark} />
                    : <Text style={styles.ctaBtnText}>
                        {showEditor ? 'Send Email' : 'Choose Template & Send'}
                      </Text>
                }
            </TouchableOpacity>

            {showEditor && (
                <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => setShowEditor(false)}
                    activeOpacity={0.7}
                >
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
    container: {},

    // §3.2 — type-overline section labels
    sectionLabel: {
        fontSize: 11, fontWeight: '700',
        letterSpacing: 0.8, color: C.textSecondary,
        marginBottom: 8, marginLeft: 4, marginTop: 4,
    },

    // §6.2 — Form cards: 16px radius, white, shadow
    formCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        overflow: 'hidden', marginBottom: 20,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    fieldGroup: { paddingHorizontal: 16, paddingVertical: 14 },
    fieldDivider: { height: 1, backgroundColor: C.surfaceLight, marginLeft: 16 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
    required:   { color: C.danger },
    // §6.7 — Input: surface-light bg, 10px radius, 48px height
    fieldInput: {
        backgroundColor: C.surfaceLight,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: C.textPrimary,
        minHeight: 46,
    },

    editorSection: { marginBottom: 8 },
    editorCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        padding: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },

    // §6.1 — Primary CTA: lime pill, full width
    ctaBtn: {
        borderRadius: 9999, height: 56,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.accent, marginTop: 8,
        shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 5,
    },
    ctaBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    ctaBtnText: { fontSize: 16, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.2 },

    cancelLink: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    cancelLinkText: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
});
