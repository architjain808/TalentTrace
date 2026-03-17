/**
 * DirectSend — compose and send an email to a known contact
 * §2.1, §6.1, §6.7 — animated focus fields, lime CTA pill, step-aware compose section
 */
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Animated, Easing,
} from 'react-native';
import { Mail, User, Building2, Briefcase, ArrowRight, Send as SendIcon } from 'lucide-react-native';
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

// §6.7 — Field with animated focus ring on the input container
function Field({ label, icon: Icon, value, onChangeText, placeholder, keyboardType, autoCapitalize, editable, required }) {
    const [focused, setFocused] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    const onFocus = () => {
        setFocused(true);
        Animated.timing(borderAnim, {
            toValue: 1, duration: 180,
            easing: Easing.out(Easing.ease), useNativeDriver: false,
        }).start();
    };
    const onBlur = () => {
        setFocused(false);
        Animated.timing(borderAnim, {
            toValue: 0, duration: 160,
            easing: Easing.in(Easing.ease), useNativeDriver: false,
        }).start();
    };

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', C.accent],
    });
    const shadowOpacity = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.15],
    });

    return (
        <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
                <Icon size={13} color={focused ? C.primary : C.textSecondary} strokeWidth={1.5} />
                <Text style={styles.fieldLabel}>
                    {label}
                    {required ? <Text style={styles.required}> *</Text> : null}
                </Text>
            </View>
            <Animated.View
                style={[
                    styles.fieldInputWrap,
                    {
                        borderColor,
                        shadowOpacity,
                        shadowColor: C.accent,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ]}
            >
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
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            </Animated.View>
        </View>
    );
}

// Step pill — shows which phase of the flow the user is on
function StepBadge({ step, label, active }) {
    return (
        <View style={[badge.wrap, active && badge.wrapActive]}>
            <View style={[badge.num, active && badge.numActive]}>
                <Text style={[badge.numText, active && badge.numTextActive]}>{step}</Text>
            </View>
            <Text style={[badge.label, active && badge.labelActive]}>{label}</Text>
        </View>
    );
}

export default function DirectSend({ onSend }) {
    const [loading, setLoading]       = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [subject, setSubject]       = useState('');
    const [body, setBody]             = useState('');
    const [form, setForm]             = useState({ toEmail: '', toName: '', company: '', role: '' });

    const contactData = { name: form.toName, company: form.company, role: form.role, email: form.toEmail };
    const canProceed  = form.toEmail.trim() && form.company.trim();

    const handleSendPress     = () => { if (!canProceed) return; setShowPicker(true); };
    const handleTemplateSelect = (tpl) => { setSubject(tpl.subject); setBody(tpl.body); setShowPicker(false); setShowEditor(true); };
    const handleBlank         = () => { setSubject(''); setBody(''); setShowPicker(false); setShowEditor(true); };

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
            {/* Step indicator */}
            <View style={styles.stepsRow}>
                <StepBadge step="1" label="Recipient" active={!showEditor} />
                <View style={styles.stepConnector} />
                <StepBadge step="2" label="Compose"   active={showEditor} />
                <View style={styles.stepConnector} />
                <StepBadge step="3" label="Send"      active={false} />
            </View>

            {/* ── Recipient section ───────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>RECIPIENT</Text>
            <View style={styles.formCard}>
                <Field
                    label="Email Address" icon={Mail}
                    value={form.toEmail}
                    onChangeText={v => setForm({ ...form, toEmail: v })}
                    placeholder="contact@company.com"
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

            {/* ── Context section ─────────────────────────────────────────── */}
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
                    placeholder="e.g. Marketing Manager"
                    autoCapitalize="words"
                    editable={!loading}
                />
            </View>

            {/* ── Compose section (after template selection) ──────────────── */}
            {showEditor && (
                <View style={styles.composeSection}>
                    {/* Compose card — single card, no nesting */}
                    <View style={styles.composeCard}>
                        {/* Card header row */}
                        <View style={styles.composeCardHeader}>
                            <View style={styles.composeIconBox}>
                                <SendIcon size={15} color={C.primaryDark} strokeWidth={1.5} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.composeCardTitle}>COMPOSE EMAIL</Text>
                                <Text style={styles.composeTo} numberOfLines={1}>
                                    To: {form.toName ? `${form.toName} <${form.toEmail}>` : form.toEmail}
                                </Text>
                            </View>
                        </View>
                        {/* Divider */}
                        <View style={styles.composeCardDivider} />
                        {/* Editor embedded — no inner card, sits flat inside this card */}
                        <EmailEditor
                            mode="compose"
                            initialSubject={subject}
                            initialBody={body}
                            contactData={contactData}
                            onSubjectChange={setSubject}
                            onBodyChange={setBody}
                            embedded
                        />
                    </View>
                </View>
            )}

            {/* §6.1 — Primary CTA pill with arrow icon */}
            <TouchableOpacity
                style={[styles.ctaBtn, (!canProceed || loading) && styles.ctaBtnDisabled]}
                onPress={showEditor ? handleFinalSend : handleSendPress}
                disabled={!canProceed || loading}
                activeOpacity={0.85}
                accessibilityLabel={showEditor ? 'Send email' : 'Choose template and send'}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={C.primaryDark} />
                ) : (
                    <View style={styles.ctaInner}>
                        <Text style={styles.ctaBtnText}>
                            {showEditor ? 'Send Email' : 'Choose Template & Send'}
                        </Text>
                        <View style={styles.ctaIconBox}>
                            <ArrowRight size={16} color={C.primaryDark} strokeWidth={2.5} />
                        </View>
                    </View>
                )}
            </TouchableOpacity>

            {showEditor && (
                <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => setShowEditor(false)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.cancelLinkText}>Cancel — go back</Text>
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

// ─── StepBadge styles ─────────────────────────────────────────────────────────
const badge = StyleSheet.create({
    wrap:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
    wrapActive: {},
    num: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: C.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
    },
    numActive:      { backgroundColor: C.primaryDark },
    numText:        { fontSize: 11, fontWeight: '700', color: C.textSecondary },
    numTextActive:  { color: C.accent },
    label:       { fontSize: 12, fontWeight: '500', color: C.textSecondary },
    labelActive: { color: C.primaryDark, fontWeight: '700' },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {},

    // Step indicator row
    stepsRow: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 20, paddingHorizontal: 2,
    },
    stepConnector: {
        flex: 1, height: 1,
        backgroundColor: C.surfaceLight, marginHorizontal: 8,
    },

    // §3.2 — type-overline section labels
    sectionLabel: {
        fontSize: 11, fontWeight: '700',
        letterSpacing: 0.88, color: C.textSecondary,
        marginBottom: 8, marginLeft: 2, marginTop: 2,
    },

    // §5.2 — Form cards: 16px radius, white, shadow
    formCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        overflow: 'hidden', marginBottom: 20,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    fieldGroup: { paddingHorizontal: 16, paddingVertical: 14 },
    fieldDivider: { height: 1, backgroundColor: C.surfaceLight, marginLeft: 16 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.3 },
    required:   { color: C.danger },

    // §6.7 — Animated input wrapper (border animates on focus)
    fieldInputWrap: {
        borderRadius: 10, borderWidth: 2,
        backgroundColor: C.surfaceLight,
    },
    fieldInput: {
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 15, color: C.textPrimary,
        minHeight: 46,
    },

    // Compose section — single card, EmailEditor embedded flat inside
    composeSection: { marginBottom: 8 },
    composeCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        overflow: 'hidden', marginBottom: 4,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },
    composeCardHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    },
    composeIconBox: {
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: C.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
    },
    composeCardTitle: {
        fontSize: 10, fontWeight: '700', letterSpacing: 0.88,
        color: C.textSecondary,
    },
    composeTo: {
        fontSize: 12, color: C.textSecondary, marginTop: 2,
    },
    composeCardDivider: {
        height: 1, backgroundColor: C.surfaceLight,
    },

    // §6.1 — Primary CTA: lime pill full width
    ctaBtn: {
        borderRadius: 9999, height: 56,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.accent, marginTop: 8,
        shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 }, elevation: 5,
    },
    ctaBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    ctaInner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    ctaBtnText: { fontSize: 16, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.1 },
    ctaIconBox: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(20,69,22,0.12)',
        alignItems: 'center', justifyContent: 'center',
    },

    cancelLink: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
    cancelLinkText: { fontSize: 14, fontWeight: '500', color: C.textSecondary },
});
