import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { useTheme } from '../constants/theme';
import {
    getEmailTemplates,
    saveEmailTemplate,
    deleteEmailTemplate,
    fillTemplate,
} from '../services/storage';

const VARIABLES = ['{{name}}', '{{company}}', '{{role}}', '{{email}}'];
const MAX_TEMPLATES = 5;

/**
 * EmailEditor — compose/edit email with template support
 *
 * Modes:
 * - "compose": Full editor with subject/body, variables, preview (used in DirectSend/EmailCard)
 * - "manage": Template management mode (used in Settings — list, edit, delete, create)
 */
export default function EmailEditor({
    mode = 'compose',
    initialSubject = '',
    initialBody = '',
    contactData = {},
    onSubjectChange,
    onBodyChange,
}) {
    const { theme } = useTheme();
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [showPreview, setShowPreview] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [templateSubject, setTemplateSubject] = useState('');
    const [templateBody, setTemplateBody] = useState('');
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        setSubject(initialSubject);
        setBody(initialBody);
    }, [initialSubject, initialBody]);

    const loadTemplates = async () => {
        const loaded = await getEmailTemplates();
        setTemplates(loaded);
    };

    const handleSubjectChange = (text) => {
        setSubject(text);
        onSubjectChange?.(text);
    };

    const handleBodyChange = (text) => {
        setBody(text);
        onBodyChange?.(text);
    };

    const insertVariable = (variable, target) => {
        if (target === 'subject') {
            const newVal = subject + variable;
            handleSubjectChange(newVal);
        } else {
            const newVal = body + variable;
            handleBodyChange(newVal);
        }
    };

    const handleSaveTemplate = async () => {
        const name = templateName.trim();
        const subj = templateSubject.trim();
        const bod = templateBody.trim();

        if (!name) {
            Alert.alert('Required', 'Template name is required.');
            return;
        }
        if (!subj && !bod) {
            Alert.alert('Required', 'Add a subject or body to save.');
            return;
        }

        try {
            const template = {
                id: editingTemplate?.id || undefined,
                name,
                subject: subj,
                body: bod,
            };
            const updated = await saveEmailTemplate(template);
            setTemplates(updated);
            setShowEditor(false);
            resetEditorForm();
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleDeleteTemplate = (id, name) => {
        Alert.alert(
            'Delete Template',
            `Delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = await deleteEmailTemplate(id);
                        setTemplates(updated);
                    },
                },
            ]
        );
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);
        setTemplateName(template.name);
        setTemplateSubject(template.subject);
        setTemplateBody(template.body);
        setShowEditor(true);
    };

    const resetEditorForm = () => {
        setEditingTemplate(null);
        setTemplateName('');
        setTemplateSubject('');
        setTemplateBody('');
    };

    // === COMPOSE MODE ===
    if (mode === 'compose') {
        return (
            <View style={styles.container}>
                {/* Subject */}
                <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    value={subject}
                    onChangeText={handleSubjectChange}
                    placeholder="Email subject..."
                    placeholderTextColor={theme.textMuted}
                />

                {/* Body */}
                <Text style={[styles.label, { color: theme.text }]}>Body</Text>
                <TextInput
                    style={[styles.input, styles.bodyInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    value={body}
                    onChangeText={handleBodyChange}
                    placeholder="Write your email..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                />

                {/* Variable buttons */}
                <View style={styles.variableRow}>
                    <Text style={[styles.variableLabel, { color: theme.textSecondary }]}>Insert:</Text>
                    {VARIABLES.map((v) => (
                        <TouchableOpacity
                            key={v}
                            style={[styles.variableBtn, { backgroundColor: theme.accentLight }]}
                            onPress={() => insertVariable(v, 'body')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.variableBtnText, { color: theme.accent }]}>{v}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Preview Toggle */}
                <TouchableOpacity
                    style={[styles.previewToggle, { borderColor: theme.border }]}
                    onPress={() => setShowPreview(!showPreview)}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.previewToggleText, { color: theme.accent }]}>
                        {showPreview ? '✏️ Edit' : '👁️ Preview'}
                    </Text>
                </TouchableOpacity>

                {showPreview && (
                    <View style={[styles.previewBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
                        <Text style={[styles.previewSubject, { color: theme.text }]}>
                            {fillTemplate(subject, contactData) || '(no subject)'}
                        </Text>
                        <Text style={[styles.previewBody, { color: theme.textSecondary }]}>
                            {fillTemplate(body, contactData) || '(no body)'}
                        </Text>
                    </View>
                )}
            </View>
        );
    }

    // === MANAGE MODE (Settings) ===
    return (
        <View style={styles.container}>
            <View style={styles.manageHeader}>
                <Text style={[styles.manageTitle, { color: theme.text }]}>
                    Email Templates ({templates.length}/{MAX_TEMPLATES})
                </Text>
                {templates.length < MAX_TEMPLATES && !showEditor && (
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: theme.accent }]}
                        onPress={() => {
                            resetEditorForm();
                            setShowEditor(true);
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.addBtnText}>+ New</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Template List */}
            {templates.map((tpl) => (
                <View key={tpl.id} style={[styles.templateCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.templateCardHeader}>
                        <Text style={[styles.templateName, { color: theme.text }]}>{tpl.name}</Text>
                        <View style={styles.templateActions}>
                            <TouchableOpacity onPress={() => handleEditTemplate(tpl)} activeOpacity={0.7}>
                                <Text style={styles.actionIcon}>✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteTemplate(tpl.id, tpl.name)} activeOpacity={0.7}>
                                <Text style={styles.actionIcon}>🗑️</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <Text style={[styles.templatePreview, { color: theme.textSecondary }]} numberOfLines={1}>
                        Subject: {tpl.subject || '(none)'}
                    </Text>
                    <Text style={[styles.templatePreview, { color: theme.textMuted }]} numberOfLines={2}>
                        {tpl.body || '(no body)'}
                    </Text>
                </View>
            ))}

            {templates.length === 0 && !showEditor && (
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    No templates yet. Tap "+ New" to create one.
                </Text>
            )}

            {/* Template Editor (Create/Edit) */}
            {showEditor && (
                <View style={[styles.editorCard, { backgroundColor: theme.card, borderColor: theme.accent }]}>
                    <Text style={[styles.editorTitle, { color: theme.text }]}>
                        {editingTemplate ? 'Edit Template' : 'New Template'}
                    </Text>

                    <Text style={[styles.label, { color: theme.text }]}>Template Name *</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                        value={templateName}
                        onChangeText={setTemplateName}
                        placeholder="e.g. Cold Outreach"
                        placeholderTextColor={theme.textMuted}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Subject</Text>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                        value={templateSubject}
                        onChangeText={setTemplateSubject}
                        placeholder="Email subject with {{company}}..."
                        placeholderTextColor={theme.textMuted}
                    />

                    <Text style={[styles.label, { color: theme.text }]}>Body</Text>
                    <TextInput
                        style={[styles.input, styles.bodyInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBg }]}
                        value={templateBody}
                        onChangeText={setTemplateBody}
                        placeholder="Email body with {{name}}, {{company}}..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />

                    {/* Variable buttons */}
                    <View style={styles.variableRow}>
                        <Text style={[styles.variableLabel, { color: theme.textSecondary }]}>Insert:</Text>
                        {VARIABLES.map((v) => (
                            <TouchableOpacity
                                key={v}
                                style={[styles.variableBtn, { backgroundColor: theme.accentLight }]}
                                onPress={() => setTemplateBody((prev) => prev + v)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.variableBtnText, { color: theme.accent }]}>{v}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.editorActions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: theme.border }]}
                            onPress={() => { setShowEditor(false); resetEditorForm(); }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: theme.accent }]}
                            onPress={handleSaveTemplate}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveBtnText}>Save Template</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 8 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
    bodyInput: { minHeight: 120, textAlignVertical: 'top' },
    variableRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 8 },
    variableLabel: { fontSize: 12, fontWeight: '500' },
    variableBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    variableBtnText: { fontSize: 12, fontWeight: '600' },
    previewToggle: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8 },
    previewToggleText: { fontSize: 13, fontWeight: '600' },
    previewBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 },
    previewSubject: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
    previewBody: { fontSize: 14, lineHeight: 20 },

    // Manage mode
    manageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    manageTitle: { fontSize: 16, fontWeight: '700' },
    addBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    templateCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
    templateCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    templateName: { fontSize: 15, fontWeight: '600' },
    templateActions: { flexDirection: 'row', gap: 12 },
    actionIcon: { fontSize: 16 },
    templatePreview: { fontSize: 13, lineHeight: 18 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 20, marginBottom: 20 },

    // Editor card
    editorCard: { borderWidth: 2, borderRadius: 14, padding: 16, marginTop: 12 },
    editorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    editorActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600' },
    saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
