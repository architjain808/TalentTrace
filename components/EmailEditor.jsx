import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Animated,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Plus, Trash2, Pencil, Eye,
    Bold, Italic, List, AtSign, Building,
    User, Briefcase, FileText, X, Save,
    ChevronDown, ChevronUp, Mail,
} from 'lucide-react-native';
import { useTheme, DS } from '../constants/theme';
import {
    getEmailTemplates,
    saveEmailTemplate,
    deleteEmailTemplate,
    fillTemplate,
} from '../services/storage';

// ─── Constants ────────────────────────────────────────────────────────────────
const VARIABLES = [
    { key: '{{name}}',    label: 'Name',    Icon: User },
    { key: '{{company}}', label: 'Company', Icon: Building },
    { key: '{{role}}',    label: 'Role',    Icon: Briefcase },
    { key: '{{email}}',   label: 'Email',   Icon: AtSign },
];

const MAX_TEMPLATES = 5;

const CARD_ACCENTS = [DS.primaryDark, DS.primary, '#2D5A30', '#3A6B3C', '#1B4D1D'];

/**
 * EmailEditor — compose/manage email templates
 *
 * Modes:
 * - "compose": Subject + body editor with formatting toolbar, variable chips, preview
 * - "manage": Full template management (list, create, edit, delete)
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

    // Compose state
    const [subject, setSubject]         = useState(initialSubject);
    const [body, setBody]               = useState(initialBody);
    const [showPreview, setShowPreview] = useState(false);
    const [activeTarget, setActiveTarget] = useState('body'); // 'body' | 'subject'

    // ── KEY FIX: Use refs for selection (not state) ──
    // State-based selection loses its value when the input loses focus
    // before the onPress fires. Refs update synchronously.
    const bodySelectionRef    = useRef({ start: 0, end: 0 });
    const subjectSelectionRef = useRef({ start: 0, end: 0 });

    // Manage state
    const [templates, setTemplates]             = useState([]);
    const [showEditor, setShowEditor]           = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateName, setTemplateName]       = useState('');
    const [templateSubject, setTemplateSubject] = useState('');
    const [templateBody, setTemplateBody]       = useState('');

    // Template body selection ref (manage mode)
    const templateBodySelectionRef = useRef({ start: 0, end: 0 });
    const templateBodyRef = useRef(null);

    // Animation refs
    const editorFade  = useRef(new Animated.Value(0)).current;
    const editorSlide = useRef(new Animated.Value(20)).current;

    const bodyRef    = useRef(null);
    const subjectRef = useRef(null);

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    useEffect(() => { loadTemplates(); }, []);

    useEffect(() => {
        setSubject(initialSubject);
        setBody(initialBody);
    }, [initialSubject, initialBody]);

    const loadTemplates = async () => {
        const loaded = await getEmailTemplates();
        setTemplates(loaded);
    };

    // ── Compose helpers ────────────────────────────────────────────────────────
    const handleSubjectChange = (text) => {
        setSubject(text);
        onSubjectChange?.(text);
    };

    const handleBodyChange = (text) => {
        setBody(text);
        onBodyChange?.(text);
    };

    /** Insert text at cursor position (using ref for accurate position) */
    const insertAt = (insertion, value, selectionRef, onChange, inputRef) => {
        const sel    = selectionRef.current;
        const before = value.substring(0, sel.start);
        const after  = value.substring(sel.end);
        onChange(before + insertion + after);
        // Refocus after a tick so the updated value has propagated
        setTimeout(() => inputRef?.current?.focus(), 40);
    };

    const insertVariable = (varKey) => {
        if (activeTarget === 'subject') {
            insertAt(varKey, subject, subjectSelectionRef, handleSubjectChange, subjectRef);
        } else {
            insertAt(varKey, body, bodySelectionRef, handleBodyChange, bodyRef);
        }
    };

    /** Wrap selected text or insert empty wrapper at cursor */
    const wrapBodyText = (wrapper) => {
        const sel    = bodySelectionRef.current;
        const before = body.substring(0, sel.start);
        const after  = body.substring(sel.end);
        if (sel.start === sel.end) {
            handleBodyChange(before + wrapper + wrapper + after);
        } else {
            const selected = body.substring(sel.start, sel.end);
            handleBodyChange(before + wrapper + selected + wrapper + after);
        }
        setTimeout(() => bodyRef.current?.focus(), 40);
    };

    const insertBullet = () => {
        const lineStart = body.lastIndexOf('\n', bodySelectionRef.current.start - 1) + 1;
        handleBodyChange(body.substring(0, lineStart) + '• ' + body.substring(lineStart));
        setTimeout(() => bodyRef.current?.focus(), 40);
    };

    // Word count helper
    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

    // ── Manage helpers ─────────────────────────────────────────────────────────
    const openEditor = (tpl = null) => {
        if (tpl) {
            setEditingTemplate(tpl);
            setTemplateName(tpl.name);
            setTemplateSubject(tpl.subject);
            setTemplateBody(tpl.body);
        } else {
            resetForm();
        }
        setShowEditor(true);
        editorFade.setValue(0);
        editorSlide.setValue(20);
        Animated.parallel([
            Animated.timing(editorFade,  { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(editorSlide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        ]).start();
    };

    const closeEditor = () => {
        Animated.parallel([
            Animated.timing(editorFade,  { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(editorSlide, { toValue: 16, duration: 180, useNativeDriver: true }),
        ]).start(() => { setShowEditor(false); resetForm(); });
    };

    const resetForm = () => {
        setEditingTemplate(null);
        setTemplateName('');
        setTemplateSubject('');
        setTemplateBody('');
    };

    const handleSaveTemplate = async () => {
        const name = templateName.trim();
        const subj = templateSubject.trim();
        const bod  = templateBody.trim();
        if (!name)         { Alert.alert('Required', 'Please give this template a name.'); return; }
        if (!subj && !bod) { Alert.alert('Required', 'Add a subject or body to save.');   return; }
        try {
            const updated = await saveEmailTemplate({
                id: editingTemplate?.id, name, subject: subj, body: bod,
            });
            setTemplates(updated);
            closeEditor();
        } catch (err) { Alert.alert('Error', err.message); }
    };

    const handleDelete = (id, name) => {
        Alert.alert('Delete Template', `Delete "${name}"? This can't be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    const updated = await deleteEmailTemplate(id);
                    setTemplates(updated);
                },
            },
        ]);
    };

    // ══════════════════════════════════════════════════════════════════════════
    // COMPOSE MODE
    // ══════════════════════════════════════════════════════════════════════════
    if (mode === 'compose') {
        const isBodyActive    = activeTarget === 'body'    && !showPreview;
        const isSubjectActive = activeTarget === 'subject' && !showPreview;

        return (
            <View style={styles.composeRoot}>
                {/* ── Main card ── */}
                <View style={[styles.envelopeCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>

                    {/* ── Edit / Preview tab row (inside card) ── */}
                    <View style={[styles.tabRow, { borderBottomColor: theme.cardBorder, backgroundColor: theme.bgTertiary }]}>
                        <TabBtn
                            label="Edit"
                            Icon={Pencil}
                            active={!showPreview}
                            onPress={() => setShowPreview(false)}
                            theme={theme}
                        />
                        <TabBtn
                            label="Preview"
                            Icon={Eye}
                            active={showPreview}
                            onPress={() => setShowPreview(true)}
                            theme={theme}
                        />
                        {showPreview && contactData?.name ? (
                            <View style={[styles.previewContactChip, { backgroundColor: DS.accentLight }]}>
                                <User size={10} color={DS.primaryDark} strokeWidth={2.5} />
                                <Text style={[styles.previewContactChipText, { color: DS.primaryDark }]} numberOfLines={1}>
                                    {contactData.name}
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* ── Subject row (always visible in edit mode) ── */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => { setActiveTarget('subject'); subjectRef.current?.focus(); }}
                        style={[
                            styles.envelopeRow,
                            { borderBottomColor: isSubjectActive ? DS.primaryDark : theme.cardBorder },
                            isSubjectActive && styles.envelopeRowFocused,
                        ]}
                    >
                        <View style={[
                            styles.fieldLabelBadge,
                            { backgroundColor: isSubjectActive ? DS.accentLight : theme.bgTertiary },
                        ]}>
                            <Text style={[
                                styles.envelopeLabel,
                                { color: isSubjectActive ? DS.primaryDark : theme.textMuted },
                            ]}>
                                SUBJ
                            </Text>
                        </View>
                        <TextInput
                            ref={subjectRef}
                            style={[styles.envelopeInput, { color: theme.text }]}
                            value={showPreview ? fillTemplate(subject, contactData) : subject}
                            onChangeText={handleSubjectChange}
                            placeholder="Email subject..."
                            placeholderTextColor={theme.textMuted}
                            onFocus={() => setActiveTarget('subject')}
                            onSelectionChange={(e) => { subjectSelectionRef.current = e.nativeEvent.selection; }}
                            returnKeyType="next"
                            onSubmitEditing={() => { setActiveTarget('body'); bodyRef.current?.focus(); }}
                            editable={!showPreview}
                        />
                    </TouchableOpacity>

                    {/* ── Body / Preview area ── */}
                    {!showPreview ? (
                        <View style={styles.bodyWrapper}>
                            {/* Toolbar */}
                            <View style={[styles.toolbar, { borderBottomColor: theme.cardBorder, backgroundColor: theme.bgTertiary }]}>
                                {/* Format group */}
                                <ToolbarBtn onPress={() => wrapBodyText('**')} Icon={Bold}   theme={theme} />
                                <ToolbarBtn onPress={() => wrapBodyText('_')}  Icon={Italic} theme={theme} />
                                <ToolbarBtn onPress={insertBullet}             Icon={List}   theme={theme} />

                                <View style={[styles.toolbarSep, { backgroundColor: theme.cardBorder }]} />

                                {/* Target toggle: where chips insert */}
                                <View style={[styles.targetToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                                    <TouchableOpacity
                                        style={[
                                            styles.targetToggleBtn,
                                            isSubjectActive && { backgroundColor: DS.primaryDark },
                                        ]}
                                        onPress={() => { setActiveTarget('subject'); subjectRef.current?.focus(); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[
                                            styles.targetToggleBtnText,
                                            { color: isSubjectActive ? DS.accent : theme.textMuted },
                                        ]}>
                                            Subj
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.targetToggleBtn,
                                            isBodyActive && { backgroundColor: DS.primaryDark },
                                        ]}
                                        onPress={() => { setActiveTarget('body'); bodyRef.current?.focus(); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[
                                            styles.targetToggleBtnText,
                                            { color: isBodyActive ? DS.accent : theme.textMuted },
                                        ]}>
                                            Body
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Variable chip scroll */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ flex: 1 }}
                                    contentContainerStyle={styles.varChipScroll}
                                >
                                    {VARIABLES.map(({ key, label, Icon }) => (
                                        <VarChip
                                            key={key}
                                            label={label}
                                            Icon={Icon}
                                            onPress={() => insertVariable(key)}
                                        />
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Body TextInput */}
                            <TextInput
                                ref={bodyRef}
                                style={[
                                    styles.bodyInput,
                                    { color: theme.text },
                                    isBodyActive && styles.bodyInputFocused,
                                ]}
                                value={body}
                                onChangeText={handleBodyChange}
                                placeholder={`Hi {{name}},\n\nI came across {{company}} and wanted to reach out about opportunities on your team...`}
                                placeholderTextColor={theme.textMuted}
                                multiline
                                textAlignVertical="top"
                                onFocus={() => setActiveTarget('body')}
                                onSelectionChange={(e) => { bodySelectionRef.current = e.nativeEvent.selection; }}
                            />

                            {/* Stats row */}
                            {(body.length > 0) && (
                                <View style={[styles.statsRow, { borderTopColor: theme.cardBorder }]}>
                                    <Text style={[styles.statsText, { color: theme.textMuted }]}>
                                        {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                    </Text>
                                    <View style={[styles.statsDot, { backgroundColor: theme.cardBorder }]} />
                                    <Text style={[styles.statsText, { color: theme.textMuted }]}>
                                        {body.length} chars
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        /* ── Preview pane ── */
                        <View style={styles.previewPane}>
                            <View style={[styles.previewHeaderRow, { borderBottomColor: theme.cardBorder }]}>
                                <Mail size={13} color={theme.textMuted} strokeWidth={2} />
                                <Text style={[styles.previewHeaderLabel, { color: theme.textMuted }]}>
                                    EMAIL PREVIEW
                                </Text>
                            </View>
                            <Text style={[styles.previewSubjectText, { color: theme.text }]}>
                                {fillTemplate(subject, contactData) || '(no subject)'}
                            </Text>
                            <View style={[styles.previewDivider, { backgroundColor: theme.cardBorder }]} />
                            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                                <Text style={[styles.previewBodyText, { color: theme.textSecondary }]}>
                                    {fillTemplate(body, contactData) || '(empty body — add content above)'}
                                </Text>
                            </ScrollView>
                            {/* Tap to edit hint */}
                            <TouchableOpacity
                                style={[styles.editHintRow, { backgroundColor: DS.accentLight }]}
                                onPress={() => setShowPreview(false)}
                                activeOpacity={0.75}
                            >
                                <Pencil size={11} color={DS.primaryDark} strokeWidth={2.5} />
                                <Text style={[styles.editHintText, { color: DS.primaryDark }]}>
                                    Tap to edit
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MANAGE MODE
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <View style={styles.manageRoot}>

            {/* ── Section header ── */}
            <View style={styles.manageTopRow}>
                <View style={styles.manageTitleGroup}>
                    <Text style={[styles.manageTitle, { color: theme.text }]}>My Templates</Text>
                    <View style={[styles.countBadge, { backgroundColor: DS.accentLight }]}>
                        <Text style={[styles.countBadgeText, { color: DS.primaryDark }]}>
                            {templates.length}/{MAX_TEMPLATES}
                        </Text>
                    </View>
                </View>

                {templates.length < MAX_TEMPLATES && !showEditor && (
                    <TouchableOpacity onPress={() => openEditor()} activeOpacity={0.8} style={styles.newBtnWrapper}>
                        <LinearGradient
                            colors={[DS.primaryDark, DS.primary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.newBtnGradient}
                        >
                            <Plus size={13} color={DS.accent} strokeWidth={2.5} />
                            <Text style={styles.newBtnLabel}>New</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Empty state ── */}
            {templates.length === 0 && !showEditor && (
                <View style={[styles.emptyCard, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}>
                    <View style={[styles.emptyIconRing, { backgroundColor: DS.accentLight }]}>
                        <FileText size={24} color={DS.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.emptyCardTitle, { color: theme.text }]}>No templates saved</Text>
                    <Text style={[styles.emptyCardDesc, { color: theme.textMuted }]}>
                        Templates speed up your HR outreach. Tap "New" to create your first one.
                    </Text>
                </View>
            )}

            {/* ── Template list ── */}
            {templates.map((tpl, index) => (
                <TemplateManageCard
                    key={tpl.id}
                    tpl={tpl}
                    index={index}
                    theme={theme}
                    onEdit={() => openEditor(tpl)}
                    onDelete={() => handleDelete(tpl.id, tpl.name)}
                />
            ))}

            {/* ── Inline create/edit editor ── */}
            {showEditor && (
                <Animated.View
                    style={[
                        styles.editorCard,
                        { backgroundColor: theme.card, borderColor: DS.primaryDark },
                        { opacity: editorFade, transform: [{ translateY: editorSlide }] },
                    ]}
                >
                    {/* Editor header gradient */}
                    <LinearGradient
                        colors={[DS.primaryDark, '#2D5A30']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.editorCardHeader}
                    >
                        <View style={styles.editorHeaderLeft}>
                            <View style={styles.editorHeaderIcon}>
                                <Mail size={14} color={DS.accent} strokeWidth={2} />
                            </View>
                            <Text style={styles.editorCardTitle}>
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={closeEditor}
                            style={styles.editorCloseBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={15} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* Editor fields */}
                    <View style={styles.editorFields}>

                        {/* Template Name */}
                        <EditorField
                            label="TEMPLATE NAME"
                            value={templateName}
                            onChangeText={setTemplateName}
                            placeholder="e.g. Cold Outreach, Follow-up..."
                            theme={theme}
                        />

                        {/* Subject */}
                        <EditorField
                            label="SUBJECT LINE"
                            value={templateSubject}
                            onChangeText={setTemplateSubject}
                            placeholder="Subject with {{company}}..."
                            theme={theme}
                        />

                        {/* Body */}
                        <View style={[styles.editorFieldBox, { backgroundColor: theme.bgTertiary }]}>
                            <Text style={[styles.editorFieldLabel, { color: theme.textMuted }]}>
                                EMAIL BODY
                            </Text>
                            <TextInput
                                ref={templateBodyRef}
                                style={[styles.editorBodyInput, { color: theme.text }]}
                                value={templateBody}
                                onChangeText={setTemplateBody}
                                placeholder={`Hi {{name}},\n\nI came across {{company}} and wanted to reach out...`}
                                placeholderTextColor={theme.textMuted}
                                multiline
                                textAlignVertical="top"
                                onSelectionChange={(e) => { templateBodySelectionRef.current = e.nativeEvent.selection; }}
                            />
                        </View>

                        {/* Variable chips — insert at cursor in body */}
                        <View style={styles.varSection}>
                            <Text style={[styles.varSectionLabel, { color: theme.textMuted }]}>
                                Insert into body →
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.varChipScroll}
                            >
                                {VARIABLES.map(({ key, label, Icon }) => (
                                    <VarChip
                                        key={key}
                                        label={label}
                                        Icon={Icon}
                                        onPress={() => {
                                            const sel    = templateBodySelectionRef.current;
                                            const before = templateBody.substring(0, sel.start);
                                            const after  = templateBody.substring(sel.end);
                                            setTemplateBody(before + key + after);
                                            setTimeout(() => templateBodyRef.current?.focus(), 40);
                                        }}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Action row */}
                        <View style={styles.editorActionsRow}>
                            <TouchableOpacity
                                style={[styles.cancelBtn, { borderColor: theme.cardBorder }]}
                                onPress={closeEditor}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSaveTemplate}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[DS.primaryDark, DS.primary]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.saveBtnGradient}
                                >
                                    <Save size={14} color={DS.accent} strokeWidth={2} />
                                    <Text style={styles.saveBtnText}>Save Template</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Edit / Preview tab button */
function TabBtn({ label, Icon, active, onPress, theme }) {
    return (
        <TouchableOpacity
            style={[styles.tab, active && { borderBottomColor: DS.primaryDark }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon
                size={13}
                color={active ? DS.primaryDark : theme.textMuted}
                strokeWidth={active ? 2.5 : 2}
            />
            <Text style={[
                styles.tabText,
                { color: active ? DS.primaryDark : theme.textMuted },
                active && { fontWeight: '700' },
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

/** Toolbar icon button — 44×44 touch target */
function ToolbarBtn({ onPress, Icon, theme }) {
    const [pressed, setPressed] = useState(false);
    return (
        <TouchableOpacity
            style={[
                styles.toolbarBtn,
                pressed && { backgroundColor: DS.accentLight },
            ]}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            activeOpacity={0.65}
        >
            <Icon size={16} color={pressed ? DS.primaryDark : theme.textSecondary} strokeWidth={2.5} />
        </TouchableOpacity>
    );
}

/** Variable chip — pill that inserts a template variable */
function VarChip({ label, Icon, onPress }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
    const handlePressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[styles.varChip, { backgroundColor: DS.accentLight, borderColor: `${DS.primaryDark}28` }]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.75}
            >
                <Icon size={11} color={DS.primaryDark} strokeWidth={2.5} />
                <Text style={[styles.varChipText, { color: DS.primaryDark }]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

/** Reusable single-line editor field */
function EditorField({ label, value, onChangeText, placeholder, theme }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={[
            styles.editorFieldBox,
            { backgroundColor: theme.bgTertiary },
            focused && { borderWidth: 1.5, borderColor: DS.primaryDark },
        ]}>
            <Text style={[styles.editorFieldLabel, { color: focused ? DS.primaryDark : theme.textMuted }]}>
                {label}
            </Text>
            <TextInput
                style={[styles.editorFieldInput, { color: theme.text }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={theme.textMuted}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
        </View>
    );
}

/** Template card in manage mode */
function TemplateManageCard({ tpl, index, theme, onEdit, onDelete }) {
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(14)).current;
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 220, delay: index * 55, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 220, delay: index * 55, useNativeDriver: true }),
        ]).start();
    }, []);

    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                {/* Left accent stripe */}
                <View style={[styles.manageCardStripe, { backgroundColor: accent }]} />

                <View style={styles.manageCardBody}>
                    {/* Top row: icon + info + actions */}
                    <TouchableOpacity
                        style={styles.manageCardTopRow}
                        onPress={() => setExpanded((e) => !e)}
                        activeOpacity={0.7}
                    >
                        {/* Template icon */}
                        <View style={[styles.manageCardIcon, { backgroundColor: `${accent}18` }]}>
                            <FileText size={15} color={accent} strokeWidth={2} />
                        </View>

                        {/* Name + subject preview */}
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[styles.manageCardName, { color: theme.text }]}
                                numberOfLines={1}
                            >
                                {tpl.name}
                            </Text>
                            <Text
                                style={[styles.manageCardSubjectPreview, { color: theme.textMuted }]}
                                numberOfLines={1}
                            >
                                {tpl.subject || '(no subject)'}
                            </Text>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.manageCardActions}>
                            <TouchableOpacity
                                style={[styles.actionIconBtn, { backgroundColor: `${DS.primary}16` }]}
                                onPress={onEdit}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Pencil size={13} color={DS.primary} strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionIconBtn, { backgroundColor: 'rgba(229,57,53,0.1)' }]}
                                onPress={onDelete}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                <Trash2 size={13} color="#E53935" strokeWidth={2} />
                            </TouchableOpacity>

                            {/* Expand toggle */}
                            <View style={[styles.expandBtn, { backgroundColor: `${accent}12` }]}>
                                {expanded
                                    ? <ChevronUp size={13} color={accent} strokeWidth={2.5} />
                                    : <ChevronDown size={13} color={accent} strokeWidth={2.5} />
                                }
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Expanded body preview */}
                    {expanded && (
                        <View style={[styles.expandedPreview, { borderTopColor: theme.cardBorder }]}>
                            <Text style={[styles.expandedPreviewText, { color: theme.textSecondary }]} numberOfLines={5}>
                                {tpl.body || '(no body content)'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    // ── COMPOSE ───────────────────────────────────────────────────────────────
    composeRoot: { gap: 0 },

    envelopeCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },

    // Tab row (Edit / Preview)
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderBottomWidth: 1,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    previewContactChip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
        gap: 4,
        maxWidth: 140,
    },
    previewContactChipText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Subject row
    envelopeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1.5,
        gap: 10,
    },
    envelopeRowFocused: {
        // The borderBottomColor is set inline via style prop
    },
    fieldLabelBadge: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
        minWidth: 40,
        alignItems: 'center',
    },
    envelopeLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    envelopeInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 0,
    },

    // Body wrapper
    bodyWrapper: {},

    // Formatting toolbar
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
        gap: 2,
    },
    toolbarBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
    },
    toolbarSep: {
        width: 1,
        height: 20,
        marginHorizontal: 4,
        borderRadius: 1,
    },

    // Target toggle (Subj / Body)
    targetToggle: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        marginRight: 6,
    },
    targetToggleBtn: {
        paddingHorizontal: 9,
        paddingVertical: 6,
        minWidth: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetToggleBtnText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    // Variable chips
    varChipScroll: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        paddingRight: 8,
    },
    varChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
        gap: 5,
    },
    varChipText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.1,
    },

    // Body TextInput
    bodyInput: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        lineHeight: 23,
        minHeight: 150,
        textAlignVertical: 'top',
    },
    bodyInputFocused: {
        // subtle visual: handled by activeTarget indicator in toolbar
    },

    // Stats row (word count / char count)
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderTopWidth: 1,
        gap: 8,
    },
    statsText: {
        fontSize: 11,
        fontWeight: '500',
    },
    statsDot: {
        width: 3,
        height: 3,
        borderRadius: 9999,
    },

    // Preview pane
    previewPane: {
        padding: 14,
        gap: 0,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 10,
        borderBottomWidth: 1,
        marginBottom: 12,
    },
    previewHeaderLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    previewSubjectText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        letterSpacing: -0.2,
    },
    previewDivider: {
        height: 1,
        marginBottom: 12,
        borderRadius: 1,
    },
    previewBodyText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 12,
    },
    editHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
        gap: 5,
        marginTop: 4,
    },
    editHintText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // ── MANAGE ────────────────────────────────────────────────────────────────
    manageRoot: { gap: 0 },

    manageTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    manageTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    manageTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    countBadge: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    // New button
    newBtnWrapper: {
        borderRadius: 9999,
        overflow: 'hidden',
    },
    newBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        gap: 5,
    },
    newBtnLabel: {
        color: DS.accent,
        fontSize: 13,
        fontWeight: '700',
    },

    // Empty card
    emptyCard: {
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    emptyIconRing: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    emptyCardDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
    },

    // Manage card
    manageCard: {
        flexDirection: 'row',
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    manageCardStripe: { width: 4 },
    manageCardBody: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 12,
        paddingLeft: 12,
    },
    manageCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    manageCardIcon: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manageCardName: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    manageCardSubjectPreview: {
        fontSize: 12,
        marginTop: 1,
    },
    manageCardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Expanded body preview
    expandedPreview: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    expandedPreviewText: {
        fontSize: 13,
        lineHeight: 19,
    },

    // ── EDITOR CARD ───────────────────────────────────────────────────────────
    editorCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: DS.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
    },
    editorCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    editorHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    editorHeaderIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(176,236,112,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editorCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: DS.textOnDark,
        letterSpacing: -0.2,
    },
    editorCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editorFields: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 16,
        gap: 8,
    },
    editorFieldBox: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    editorFieldLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.9,
        marginBottom: 4,
    },
    editorFieldInput: {
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: Platform.OS === 'android' ? 2 : 0,
    },
    editorBodyInput: {
        fontSize: 14,
        lineHeight: 21,
        minHeight: 120,
        textAlignVertical: 'top',
        paddingVertical: Platform.OS === 'android' ? 2 : 0,
    },

    // Variable chips (manage mode)
    varSection: { gap: 6 },
    varSectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.1,
    },

    // Editor action row
    editorActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        gap: 7,
    },
    saveBtnText: {
        color: DS.accent,
        fontSize: 14,
        fontWeight: '700',
    },
});
