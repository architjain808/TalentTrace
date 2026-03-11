/**
 * Email Templates Screen — full-page template manager
 * Navigated to from Profile → Email Templates row
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
    getEmailTemplates, saveEmailTemplate, deleteEmailTemplate, fillTemplate,
} from '../services/storage';

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
    dangerBg:     '#FFEBEE',
};

const VARIABLES = ['{{name}}', '{{company}}', '{{role}}', '{{email}}'];
const MAX_TEMPLATES = 5;

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit, onDelete }) {
    return (
        <View style={styles.templateCard}>
            <View style={styles.templateCardHeader}>
                <View style={styles.templateIconBox}>
                    <FileText size={18} color={C.primary} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateSubjectPreview} numberOfLines={1}>
                        {template.subject || '(no subject)'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => onEdit(template)}
                    style={styles.cardAction}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Edit ${template.name}`}
                >
                    <Pencil size={16} color={C.primary} strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onDelete(template)}
                    style={styles.cardAction}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Delete ${template.name}`}
                >
                    <Trash2 size={16} color={C.danger} strokeWidth={1.5} />
                </TouchableOpacity>
            </View>
            <Text style={styles.templateBodyPreview} numberOfLines={2}>
                {template.body || '(no body)'}
            </Text>
        </View>
    );
}

// ── Template Editor (Create / Edit) ──────────────────────────────────────────

function TemplateEditor({ template, onSave, onCancel }) {
    const [name, setName]       = useState(template?.name    || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [body, setBody]       = useState(template?.body    || '');
    const [showPreview, setShowPreview] = useState(false);
    const [saving, setSaving]   = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Required', 'Template name is required.'); return; }
        if (!subject.trim() && !body.trim()) { Alert.alert('Required', 'Add a subject or body.'); return; }
        setSaving(true);
        try {
            await onSave({ id: template?.id, name: name.trim(), subject: subject.trim(), body: body.trim() });
        } finally { setSaving(false); }
    };

    const insertVar = (v) => setBody(prev => prev + v);

    return (
        <View style={styles.editorCard}>
            <Text style={styles.editorTitle}>{template ? 'Edit Template' : 'New Template'}</Text>

            {/* Name field */}
            <Text style={styles.fieldLabel}>Template Name *</Text>
            <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Cold Outreach"
                placeholderTextColor={C.textSecondary}
                autoCapitalize="words"
            />

            {/* Subject field */}
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
                style={styles.fieldInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Your application for {{company}}..."
                placeholderTextColor={C.textSecondary}
                autoCapitalize="sentences"
            />

            {/* Body field */}
            <Text style={styles.fieldLabel}>Body</Text>
            <TextInput
                style={[styles.fieldInput, styles.bodyInput]}
                value={body}
                onChangeText={setBody}
                placeholder="Hi {{name}}, I came across {{company}} and..."
                placeholderTextColor={C.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="sentences"
            />

            {/* Variable insert chips */}
            <Text style={styles.varLabel}>Insert variable:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={styles.varRow}>
                    {VARIABLES.map(v => (
                        <TouchableOpacity
                            key={v}
                            style={styles.varChip}
                            onPress={() => insertVar(v)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.varChipText}>{v}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Preview toggle */}
            <TouchableOpacity
                style={styles.previewToggle}
                onPress={() => setShowPreview(p => !p)}
                activeOpacity={0.7}
            >
                {showPreview
                    ? <EyeOff size={16} color={C.primary} strokeWidth={1.5} />
                    : <Eye    size={16} color={C.primary} strokeWidth={1.5} />
                }
                <Text style={styles.previewToggleText}>{showPreview ? 'Hide Preview' : 'Show Preview'}</Text>
            </TouchableOpacity>

            {showPreview && (
                <View style={styles.previewBox}>
                    <Text style={styles.previewSubject}>{subject || '(no subject)'}</Text>
                    <Text style={styles.previewBody}>{body || '(no body)'}</Text>
                </View>
            )}

            {/* Actions */}
            <View style={styles.editorActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                    {saving
                        ? <ActivityIndicator size="small" color={C.primaryDark} />
                        : <Text style={styles.saveBtnText}>Save Template</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function TemplatesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [templates, setTemplates]     = useState([]);
    const [editing, setEditing]         = useState(null);     // template being edited or {} for new
    const [showEditor, setShowEditor]   = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        const loaded = await getEmailTemplates();
        setTemplates(loaded);
    };

    const handleSave = async (templateData) => {
        try {
            const updated = await saveEmailTemplate(templateData);
            setTemplates(updated);
            setShowEditor(false);
            setEditing(null);
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleDelete = (template) => {
        Alert.alert(
            'Delete Template',
            `Delete "${template.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        const updated = await deleteEmailTemplate(template.id);
                        setTemplates(updated);
                    },
                },
            ]
        );
    };

    const openNew = () => {
        setEditing(null);
        setShowEditor(true);
    };

    const openEdit = (template) => {
        setEditing(template);
        setShowEditor(true);
    };

    const canAdd = templates.length < MAX_TEMPLATES;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft size={22} color={C.primaryDark} strokeWidth={2} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Email Templates</Text>
                    <Text style={styles.headerSub}>{templates.length} / {MAX_TEMPLATES} templates</Text>
                </View>
                {canAdd && !showEditor && (
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={openNew}
                        activeOpacity={0.85}
                        accessibilityLabel="Add new template"
                    >
                        <Plus size={18} color={C.primaryDark} strokeWidth={2.5} />
                        <Text style={styles.addBtnText}>New</Text>
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Editor appears at top when active */}
                    {showEditor && (
                        <TemplateEditor
                            template={editing}
                            onSave={handleSave}
                            onCancel={() => { setShowEditor(false); setEditing(null); }}
                        />
                    )}

                    {/* Template list */}
                    {templates.length > 0 ? (
                        templates.map(tpl => (
                            <TemplateCard
                                key={tpl.id}
                                template={tpl}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : !showEditor ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <FileText size={32} color={C.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.emptyTitle}>No templates yet</Text>
                            <Text style={styles.emptyDesc}>
                                Create reusable email templates with variable placeholders like {'{{name}}'} and {'{{company}}'}.
                            </Text>
                            <TouchableOpacity style={styles.emptyAddBtn} onPress={openNew} activeOpacity={0.85}>
                                <Plus size={18} color={C.primaryDark} strokeWidth={2.5} />
                                <Text style={styles.emptyAddBtnText}>Create First Template</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.white },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.surfaceLight, gap: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.primaryDark, letterSpacing: -0.3 },
    headerSub:   { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 9,
        backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    addBtnText: { fontSize: 14, fontWeight: '700', color: C.primaryDark },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

    // ── Template card ──
    templateCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    templateCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    templateIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center',
    },
    templateName: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
    templateSubjectPreview: { fontSize: 12, color: C.textSecondary, marginTop: 1 },
    templateBodyPreview:    { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
    cardAction: { padding: 4 },

    // ── Template editor ──
    editorCard: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1.5, borderColor: C.accent,
        padding: 20, marginBottom: 20,
        shadowColor: C.accent, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    editorTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 20 },
    fieldLabel:  { fontSize: 13, fontWeight: '600', color: C.textPrimary, marginBottom: 6 },
    fieldInput: {
        backgroundColor: C.surfaceLight, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: C.textPrimary, marginBottom: 16,
    },
    bodyInput: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
    varLabel: { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 8 },
    varRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    varChip: {
        backgroundColor: C.accentLight, borderRadius: 9999,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    varChipText: { fontSize: 12, fontWeight: '600', color: C.primaryDark },

    previewToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    previewToggleText: { fontSize: 13, fontWeight: '600', color: C.primary },
    previewBox: {
        backgroundColor: C.surfaceLight, borderRadius: 12,
        padding: 14, marginBottom: 16,
    },
    previewSubject: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
    previewBody:    { fontSize: 14, color: C.textSecondary, lineHeight: 21 },

    editorActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.surfaceLight,
        paddingVertical: 13, alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
    saveBtn: {
        flex: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
        backgroundColor: C.accent, flexDirection: 'row', justifyContent: 'center',
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: C.primaryDark },

    // ── Empty state ──
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
    emptyIconBox: {
        width: 72, height: 72, borderRadius: 20,
        backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
    emptyDesc:  { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 9999, paddingHorizontal: 20, paddingVertical: 13,
        backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    emptyAddBtnText: { fontSize: 15, fontWeight: '700', color: C.primaryDark },
});
