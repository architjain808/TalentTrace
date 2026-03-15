/**
 * Email Templates Screen — full-page template manager
 * Navigated to from Profile → "Email Templates"
 * Design system: UI_REDESIGN_REFERENCE.md (premium nature-fintech)
 */
import React, { useState, useEffect, useRef } from 'react';
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
    Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ArrowLeft, Plus, Pencil, Trash2, FileText,
    Eye, Bold, Italic, List,
    AtSign, Building, User, Briefcase,
    ChevronDown, ChevronUp, X, Save, Mail,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import {
    getEmailTemplates, saveEmailTemplate, deleteEmailTemplate,
} from '../services/storage';

// ─── Design tokens (§2 of UI_REDESIGN_REFERENCE) ─────────────────────────────
const C = {
    primaryDark:  '#144516',
    primary:      '#416943',
    primaryMid:   '#2D5A30',
    accent:       '#B0EC70',
    accentLight:  'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    bg:           '#F8FAF8',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    danger:       '#E53935',
};

const VARIABLES = [
    { key: '{{name}}',    label: 'Name',    Icon: User },
    { key: '{{company}}', label: 'Company', Icon: Building },
    { key: '{{role}}',    label: 'Role',    Icon: Briefcase },
    { key: '{{email}}',   label: 'Email',   Icon: AtSign },
];

const MAX_TEMPLATES = 5;
const CARD_ACCENTS  = [C.primaryDark, C.primary, C.primaryMid, '#3A6B3C', '#1B4D1D'];

// useNativeDriver is not supported on React Native Web
const ND = Platform.OS !== 'web';

// ─── TemplateCard ─────────────────────────────────────────────────────────────
function TemplateCard({ template, index, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(14)).current;

    const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 240, delay: index * 60, useNativeDriver: ND }),
            Animated.timing(slideAnim, { toValue: 0, duration: 240, delay: index * 60, useNativeDriver: ND }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 10 }}>
            <View style={[tCard.card, { borderColor: `${accent}28` }]}>
                {/* Left accent stripe */}
                <View style={[tCard.stripe, { backgroundColor: accent }]} />

                <View style={tCard.body}>
                    {/* Top row: icon + info + actions */}
                    <View style={tCard.topRow}>
                        <View style={[tCard.iconBox, { backgroundColor: `${accent}18` }]}>
                            <FileText size={15} color={accent} strokeWidth={2} />
                        </View>

                        <View style={{ flex: 1 }}>
                            <Text style={tCard.name} numberOfLines={1}>{template.name}</Text>
                            <Text style={tCard.subject} numberOfLines={1}>
                                {template.subject || '(no subject)'}
                            </Text>
                        </View>

                        <View style={tCard.actions}>
                            <TouchableOpacity
                                style={[tCard.actionBtn, { backgroundColor: `${C.primary}14` }]}
                                onPress={() => onEdit(template)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                accessibilityLabel={`Edit ${template.name}`}
                            >
                                <Pencil size={13} color={C.primary} strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[tCard.actionBtn, { backgroundColor: `${C.danger}12` }]}
                                onPress={() => onDelete(template)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                accessibilityLabel={`Delete ${template.name}`}
                            >
                                <Trash2 size={13} color={C.danger} strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[tCard.expandBtn, { backgroundColor: `${accent}16` }]}
                                onPress={() => setExpanded(e => !e)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                                {expanded
                                    ? <ChevronUp   size={13} color={accent} strokeWidth={2.5} />
                                    : <ChevronDown size={13} color={accent} strokeWidth={2.5} />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Expanded body preview */}
                    {expanded && (
                        <View style={[tCard.expandedBody, { borderTopColor: C.surfaceLight }]}>
                            <Text style={tCard.expandedText} numberOfLines={5}>
                                {template.body || '(no body content)'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

// ─── VarChip with spring press animation ─────────────────────────────────────
function VarChip({ label, Icon, onPress }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pressIn  = () => Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: ND, speed: 50, bounciness: 4 }).start();
    const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: ND, speed: 30, bounciness: 8 }).start();
    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={editor.varChip}
                onPress={onPress}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={0.75}
            >
                <Icon size={11} color={C.primaryDark} strokeWidth={2.5} />
                <Text style={editor.varChipText}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── TemplateEditor (inline create/edit form) ─────────────────────────────────
function TemplateEditor({ template, onSave, onCancel }) {
    const [name,        setName]        = useState(template?.name    || '');
    const [subject,     setSubject]     = useState(template?.subject || '');
    const [body,        setBody]        = useState(template?.body    || '');
    const [showPreview, setShowPreview] = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [activeTarget, setActiveTarget] = useState('body');

    // ── KEY FIX: refs instead of state for selection ──
    // State-based selection loses its value when the input loses focus
    // before onPress fires. Refs update synchronously and persist.
    const bodySelectionRef    = useRef({ start: 0, end: 0 });
    const subjectSelectionRef = useRef({ start: 0, end: 0 });

    const bodyRef    = useRef(null);
    const subjectRef = useRef(null);

    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: ND }),
            Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 10, useNativeDriver: ND }),
        ]).start();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) { Alert.alert('Required', 'Template name is required.'); return; }
        if (!subject.trim() && !body.trim()) { Alert.alert('Required', 'Add a subject or body.'); return; }
        setSaving(true);
        try {
            await onSave({ id: template?.id, name: name.trim(), subject: subject.trim(), body: body.trim() });
        } finally { setSaving(false); }
    };

    // Insert at cursor using refs — accurate even after input loses focus
    const insertAt = (text, value, setValue, selRef, inputRef) => {
        const sel    = selRef.current;
        const before = value.substring(0, sel.start);
        const after  = value.substring(sel.end);
        setValue(before + text + after);
        setTimeout(() => inputRef?.current?.focus(), 40);
    };

    const insertVar = (varKey) => {
        if (activeTarget === 'subject') {
            insertAt(varKey, subject, setSubject, subjectSelectionRef, subjectRef);
        } else {
            insertAt(varKey, body, setBody, bodySelectionRef, bodyRef);
        }
    };

    const wrapBody = (wrapper) => {
        const { start, end } = bodySelectionRef.current;
        if (start === end) {
            setBody(b => b.substring(0, start) + wrapper + wrapper + b.substring(end));
        } else {
            setBody(b => b.substring(0, start) + wrapper + b.substring(start, end) + wrapper + b.substring(end));
        }
        setTimeout(() => bodyRef.current?.focus(), 40);
    };

    const insertBullet = () => {
        const { start } = bodySelectionRef.current;
        const lineStart = body.lastIndexOf('\n', start - 1) + 1;
        setBody(b => b.substring(0, lineStart) + '• ' + b.substring(lineStart));
        setTimeout(() => bodyRef.current?.focus(), 40);
    };

    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

    const isBodyActive    = activeTarget === 'body'    && !showPreview;
    const isSubjectActive = activeTarget === 'subject' && !showPreview;

    return (
        <Animated.View style={[editor.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Gradient header */}
            <LinearGradient
                colors={[C.primaryDark, C.primaryMid]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={editor.header}
            >
                <View style={editor.headerLeft}>
                    <View style={editor.headerIcon}>
                        <Mail size={14} color={C.accent} strokeWidth={2} />
                    </View>
                    <Text style={editor.headerTitle}>
                        {template ? 'Edit Template' : 'New Template'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={editor.headerClose}
                    onPress={onCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Cancel"
                >
                    <X size={15} color="rgba(255,255,255,0.8)" strokeWidth={2.5} />
                </TouchableOpacity>
            </LinearGradient>

            {/* Edit / Preview tab bar */}
            <View style={editor.tabRow}>
                <TouchableOpacity
                    style={[editor.tab, !showPreview && editor.tabActive]}
                    onPress={() => setShowPreview(false)}
                    activeOpacity={0.7}
                >
                    <Pencil size={13} color={!showPreview ? C.primaryDark : C.textSecondary} strokeWidth={!showPreview ? 2.5 : 2} />
                    <Text style={[editor.tabText, { color: !showPreview ? C.primaryDark : C.textSecondary, fontWeight: !showPreview ? '700' : '500' }]}>
                        Edit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[editor.tab, showPreview && editor.tabActive]}
                    onPress={() => setShowPreview(true)}
                    activeOpacity={0.7}
                >
                    <Eye size={13} color={showPreview ? C.primaryDark : C.textSecondary} strokeWidth={showPreview ? 2.5 : 2} />
                    <Text style={[editor.tabText, { color: showPreview ? C.primaryDark : C.textSecondary, fontWeight: showPreview ? '700' : '500' }]}>
                        Preview
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Form body */}
            <View style={editor.formBody}>

                {!showPreview ? (<>
                    {/* Template Name */}
                    <FocusableField label="TEMPLATE NAME">
                        <TextInput
                            style={editor.fieldInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Cold Outreach, Follow-up..."
                            placeholderTextColor={C.textSecondary}
                            autoCapitalize="words"
                        />
                    </FocusableField>

                    {/* Subject — with active indicator */}
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => { setActiveTarget('subject'); subjectRef.current?.focus(); }}
                        style={[
                            editor.fieldBox,
                            { backgroundColor: C.bg },
                            isSubjectActive && editor.fieldBoxActive,
                        ]}
                    >
                        <Text style={[editor.fieldOverline, isSubjectActive && { color: C.primaryDark }]}>
                            SUBJECT LINE
                        </Text>
                        <TextInput
                            ref={subjectRef}
                            style={editor.fieldInput}
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="Your application at {{company}}..."
                            placeholderTextColor={C.textSecondary}
                            onFocus={() => setActiveTarget('subject')}
                            onSelectionChange={e => { subjectSelectionRef.current = e.nativeEvent.selection; }}
                            returnKeyType="next"
                            onSubmitEditing={() => { setActiveTarget('body'); bodyRef.current?.focus(); }}
                        />
                    </TouchableOpacity>

                    {/* Body with toolbar */}
                    <View style={[editor.bodyBox, isBodyActive && editor.bodyBoxActive]}>
                        <Text style={[editor.fieldOverline, { paddingHorizontal: 12, paddingTop: 10 }, isBodyActive && { color: C.primaryDark }]}>
                            EMAIL BODY
                        </Text>

                        {/* Toolbar */}
                        <View style={[editor.toolbar, { borderBottomColor: C.surfaceLight }]}>
                            {/* Format buttons */}
                            <ToolbarButton onPress={() => wrapBody('**')} accessibilityLabel="Bold">
                                <Bold size={15} color={C.textSecondary} strokeWidth={2.5} />
                            </ToolbarButton>
                            <ToolbarButton onPress={() => wrapBody('_')} accessibilityLabel="Italic">
                                <Italic size={15} color={C.textSecondary} strokeWidth={2.5} />
                            </ToolbarButton>
                            <ToolbarButton onPress={insertBullet} accessibilityLabel="Bullet point">
                                <List size={15} color={C.textSecondary} strokeWidth={2.5} />
                            </ToolbarButton>

                            <View style={[editor.toolDivider, { backgroundColor: C.surfaceLight }]} />

                            {/* Target toggle: Subj / Body */}
                            <View style={editor.targetToggle}>
                                <TouchableOpacity
                                    style={[editor.targetBtn, isSubjectActive && editor.targetBtnActive]}
                                    onPress={() => { setActiveTarget('subject'); subjectRef.current?.focus(); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[editor.targetBtnText, { color: isSubjectActive ? C.accent : C.textSecondary }]}>
                                        Subj
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[editor.targetBtn, isBodyActive && editor.targetBtnActive]}
                                    onPress={() => { setActiveTarget('body'); bodyRef.current?.focus(); }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[editor.targetBtnText, { color: isBodyActive ? C.accent : C.textSecondary }]}>
                                        Body
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Variable chips */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ flex: 1 }}
                                contentContainerStyle={editor.chipRow}
                            >
                                {VARIABLES.map(({ key, label, Icon }) => (
                                    <VarChip
                                        key={key}
                                        label={label}
                                        Icon={Icon}
                                        onPress={() => insertVar(key)}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Body text area */}
                        <TextInput
                            ref={bodyRef}
                            style={editor.bodyTextarea}
                            value={body}
                            onChangeText={setBody}
                            placeholder={`Hi {{name}},\n\nI came across {{company}} and wanted to reach out about joining your team...`}
                            placeholderTextColor={C.textSecondary}
                            multiline
                            textAlignVertical="top"
                            onFocus={() => setActiveTarget('body')}
                            onSelectionChange={e => { bodySelectionRef.current = e.nativeEvent.selection; }}
                        />
                        {body.length > 0 && (
                            <View style={editor.statsRow}>
                                <Text style={editor.statsText}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</Text>
                                <View style={editor.statsDot} />
                                <Text style={editor.statsText}>{body.length} chars</Text>
                            </View>
                        )}
                    </View>
                </>) : (
                    /* Preview pane */
                    <View style={[editor.previewBox, { backgroundColor: C.bg, borderColor: C.surfaceLight }]}>
                        <View style={[editor.previewHeaderRow, { borderBottomColor: C.surfaceLight }]}>
                            <Mail size={12} color={C.textSecondary} strokeWidth={2} />
                            <Text style={editor.previewHeaderLabel}>EMAIL PREVIEW</Text>
                        </View>
                        <Text style={editor.previewSubject}>{subject || '(no subject)'}</Text>
                        <View style={[editor.previewDivider, { backgroundColor: C.surfaceLight }]} />
                        <Text style={editor.previewBody}>{body || '(no body)'}</Text>
                        <TouchableOpacity
                            style={editor.editHint}
                            onPress={() => setShowPreview(false)}
                            activeOpacity={0.75}
                        >
                            <Pencil size={11} color={C.primaryDark} strokeWidth={2.5} />
                            <Text style={editor.editHintText}>Tap to edit</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Save / Cancel */}
                <View style={editor.actionRow}>
                    <TouchableOpacity
                        style={[editor.cancelBtn, { borderColor: C.surfaceLight }]}
                        onPress={onCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={[editor.cancelText, { color: C.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[editor.saveBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={[C.primaryDark, C.primary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={editor.saveBtnGradient}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color={C.accent} />
                                : <><Save size={14} color={C.accent} strokeWidth={2} /><Text style={editor.saveText}>Save Template</Text></>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

// ─── Reusable focusable field wrapper ────────────────────────────────────────
function FocusableField({ label, children }) {
    const [focused, setFocused] = useState(false);
    return (
        <View
            style={[editor.fieldBox, { backgroundColor: C.bg }, focused && editor.fieldBoxActive]}
        >
            <Text style={[editor.fieldOverline, focused && { color: C.primaryDark }]}>{label}</Text>
            {React.cloneElement(children, {
                onFocus: () => setFocused(true),
                onBlur:  () => setFocused(false),
            })}
        </View>
    );
}

// ─── Toolbar button with press feedback ──────────────────────────────────────
function ToolbarButton({ onPress, children, accessibilityLabel }) {
    const [pressed, setPressed] = useState(false);
    return (
        <TouchableOpacity
            style={[editor.toolBtn, pressed && { backgroundColor: C.accentLight }]}
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityLabel={accessibilityLabel}
            activeOpacity={0.7}
        >
            {children}
        </TouchableOpacity>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TemplatesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [templates, setTemplates] = useState([]);
    const [editing,   setEditing]   = useState(null);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        const loaded = await getEmailTemplates();
        setTemplates(loaded);
    };

    const handleSave = async (data) => {
        try {
            const updated = await saveEmailTemplate(data);
            setTemplates(updated);
            setShowEditor(false);
            setEditing(null);
        } catch (err) { Alert.alert('Error', err.message); }
    };

    const handleDelete = (template) => {
        Alert.alert(
            'Delete Template',
            `Delete "${template.name}"? This can't be undone.`,
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

    const openNew  = () => { setEditing(null); setShowEditor(true); };
    const openEdit = (t)  => { setEditing(t);  setShowEditor(true); };
    const closeEditor    = () => { setShowEditor(false); setEditing(null); };

    const canAdd = templates.length < MAX_TEMPLATES;

    return (
        <View style={[screen.root, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* ── Gradient header ── */}
            <LinearGradient
                colors={[C.primaryDark, C.primaryMid]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={screen.header}
            >
                <TouchableOpacity
                    style={screen.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    accessibilityLabel="Go back"
                >
                    <ArrowLeft size={20} color={C.white} strokeWidth={2} />
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                    <Text style={screen.headerTitle}>Email Templates</Text>
                    <Text style={screen.headerSub}>{templates.length} / {MAX_TEMPLATES} saved</Text>
                </View>

                {canAdd && !showEditor && (
                    <TouchableOpacity
                        style={screen.newBtn}
                        onPress={openNew}
                        activeOpacity={0.85}
                        accessibilityLabel="Create new template"
                    >
                        <Plus size={15} color={C.primaryDark} strokeWidth={2.5} />
                        <Text style={screen.newBtnText}>New</Text>
                    </TouchableOpacity>
                )}
            </LinearGradient>

            {/* ── Content ── */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={screen.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Inline editor appears first */}
                    {showEditor && (
                        <TemplateEditor
                            template={editing}
                            onSave={handleSave}
                            onCancel={closeEditor}
                        />
                    )}

                    {/* Template list */}
                    {templates.length > 0 ? (
                        <View>
                            {!showEditor && (
                                <View style={screen.listHeader}>
                                    <Text style={screen.listHeaderLabel}>SAVED TEMPLATES</Text>
                                    <View style={[screen.countBadge, { backgroundColor: C.accentLight }]}>
                                        <Text style={[screen.countBadgeText, { color: C.primaryDark }]}>
                                            {templates.length}/{MAX_TEMPLATES}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {templates.map((tpl, i) => (
                                <TemplateCard
                                    key={tpl.id}
                                    template={tpl}
                                    index={i}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </View>
                    ) : !showEditor ? (

                        /* ── Empty state ── */
                        <View style={screen.emptyState}>
                            <View style={screen.emptyIconBox}>
                                <FileText size={32} color={C.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={screen.emptyTitle}>No templates yet</Text>
                            <Text style={screen.emptyDesc}>
                                Create reusable email templates with dynamic variables like{' '}
                                <Text style={{ fontWeight: '700', color: C.primaryDark }}>{'{{name}}'}</Text> and{' '}
                                <Text style={{ fontWeight: '700', color: C.primaryDark }}>{'{{company}}'}</Text> to speed up your HR outreach.
                            </Text>
                            <TouchableOpacity
                                style={screen.emptyBtn}
                                onPress={openNew}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[C.primaryDark, C.primary]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={screen.emptyBtnGradient}
                                >
                                    <Plus size={16} color={C.accent} strokeWidth={2.5} />
                                    <Text style={screen.emptyBtnText}>Create First Template</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Template card styles ─────────────────────────────────────────────────────
const tCard = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: C.white,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    stripe: { width: 4 },
    body: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: C.textPrimary,
        letterSpacing: -0.1,
    },
    subject: {
        fontSize: 12,
        color: C.textSecondary,
        marginTop: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionBtn: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandBtn: {
        width: 26,
        height: 26,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandedBody: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    expandedText: {
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 19,
    },
});

// ─── Editor styles ────────────────────────────────────────────────────────────
const editor = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: C.primaryDark,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: C.white,
        shadowColor: C.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 6,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIcon: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: 'rgba(176,236,112,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: C.white,
        letterSpacing: -0.2,
    },
    headerClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Edit / Preview tab row
    tabRow: {
        flexDirection: 'row',
        backgroundColor: C.bg,
        borderBottomWidth: 1,
        borderBottomColor: C.surfaceLight,
        paddingHorizontal: 4,
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
    tabActive: {
        borderBottomColor: C.primaryDark,
    },
    tabText: {
        fontSize: 13,
        letterSpacing: 0.1,
    },

    formBody: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 16,
        gap: 8,
    },

    // Field group: background pill with overline label + input
    fieldBox: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    fieldBoxActive: {
        borderColor: C.primaryDark,
    },
    fieldOverline: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.0,
        color: C.textSecondary,
        marginBottom: 4,
    },
    fieldInput: {
        fontSize: 14,
        fontWeight: '500',
        color: C.textPrimary,
        paddingVertical: Platform.OS === 'android' ? 2 : 0,
    },

    // Body section with toolbar
    bodyBox: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: C.bg,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    bodyBoxActive: {
        borderColor: C.primaryDark,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: 1,
        gap: 2,
    },
    toolBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9,
    },
    toolDivider: {
        width: 1,
        height: 18,
        marginHorizontal: 4,
        borderRadius: 1,
    },

    // Subject / Body target toggle
    targetToggle: {
        flexDirection: 'row',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.surfaceLight,
        overflow: 'hidden',
        marginRight: 6,
    },
    targetBtn: {
        paddingHorizontal: 9,
        paddingVertical: 6,
        minWidth: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetBtnActive: {
        backgroundColor: C.primaryDark,
    },
    targetBtnText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },

    chipRow: {
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
        gap: 4,
        backgroundColor: C.accentLight,
        borderWidth: 1,
        borderColor: `${C.primaryDark}28`,
    },
    varChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: C.primaryDark,
    },
    bodyTextarea: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 15,
        lineHeight: 23,
        minHeight: 150,
        textAlignVertical: 'top',
        color: C.textPrimary,
    },

    // Word + char stats row
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 10,
        gap: 8,
    },
    statsText: {
        fontSize: 11,
        fontWeight: '500',
        color: C.textSecondary,
    },
    statsDot: {
        width: 3,
        height: 3,
        borderRadius: 9999,
        backgroundColor: C.surfaceLight,
    },

    // Preview pane
    previewBox: {
        borderRadius: 12,
        borderWidth: 1,
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
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.0,
        color: C.textSecondary,
    },
    previewSubject: {
        fontSize: 16,
        fontWeight: '600',
        color: C.textPrimary,
        marginBottom: 10,
        letterSpacing: -0.2,
    },
    previewDivider: {
        height: 1,
        marginBottom: 12,
        borderRadius: 1,
    },
    previewBody: {
        fontSize: 14,
        color: C.textSecondary,
        lineHeight: 22,
        marginBottom: 12,
    },
    editHint: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: C.accentLight,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 9999,
        gap: 5,
    },
    editHintText: {
        fontSize: 11,
        fontWeight: '700',
        color: C.primaryDark,
    },

    // Action buttons
    actionRow: {
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
    cancelText: {
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
    saveText: {
        color: C.accent,
        fontSize: 14,
        fontWeight: '700',
    },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const screen = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 16,
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: C.white,
        letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        marginTop: 1,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: C.accent,
        borderRadius: 9999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        shadowColor: C.accent,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    newBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: C.primaryDark,
    },

    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    listHeaderLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
        color: C.textSecondary,
    },
    countBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
    },
    countBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },

    emptyState: {
        alignItems: 'center',
        paddingTop: 64,
        paddingHorizontal: 32,
    },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: C.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: C.textPrimary,
        letterSpacing: -0.3,
        marginBottom: 10,
    },
    emptyDesc: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 28,
    },
    emptyBtn: {
        borderRadius: 9999,
        overflow: 'hidden',
        shadowColor: C.primaryDark,
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    emptyBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    emptyBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: C.accent,
    },
});
