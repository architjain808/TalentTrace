import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, FileText, Edit3, ChevronRight, Mail } from 'lucide-react-native';
import { useTheme, DS } from '../constants/theme';
import { getEmailTemplates, getDefaultTemplateId, fillTemplate } from '../services/storage';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.76;

/**
 * TemplatePicker — premium bottom sheet to select an email template before sending
 *
 * Props:
 * - visible: boolean
 * - onSelect: (template) => void
 * - onBlank: () => void
 * - onClose: () => void
 * - contactData: { name, company, role, email }
 */
export default function TemplatePicker({ visible, onSelect, onBlank, onClose, contactData = {} }) {
    const { theme } = useTheme();
    const [templates, setTemplates] = useState([]);
    const [defaultId, setDefaultId] = useState(null);

    const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            loadData();
            // Reset to starting position before animating in
            slideAnim.setValue(SHEET_HEIGHT);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 55,
                    friction: 9,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const loadData = async () => {
        const loaded = await getEmailTemplates();
        const defId = await getDefaultTemplateId();
        setTemplates(loaded);
        setDefaultId(defId);
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SHEET_HEIGHT,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            slideAnim.setValue(SHEET_HEIGHT);
            backdropAnim.setValue(0);
            onClose();
        });
    };

    const handleSelect = (template) => {
        const filled = {
            ...template,
            subject: fillTemplate(template.subject, contactData),
            body: fillTemplate(template.body, contactData),
        };
        onSelect(filled);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            {/* Single root view required by React Native Modal */}
            <View style={styles.modalRoot}>
                {/* Tappable backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        { backgroundColor: theme.bg },
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                {/* Drag Handle */}
                <View style={styles.dragHandleWrapper}>
                    <View style={[styles.dragHandle, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
                </View>

                {/* Gradient Header */}
                <LinearGradient
                    colors={[DS.primaryDark, '#2D5A30', DS.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sheetHeader}
                >
                    <View style={styles.headerLeft}>
                        <View style={styles.headerIconBox}>
                            <Mail size={16} color={DS.accent} strokeWidth={2} />
                        </View>
                        <View>
                            <Text style={styles.sheetTitle}>Choose Template</Text>
                            <Text style={styles.sheetSubtitle}>
                                {templates.length} template{templates.length !== 1 ? 's' : ''} saved
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={styles.closeBtn}
                        activeOpacity={0.75}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={16} color="rgba(255,255,255,0.85)" strokeWidth={2.5} />
                    </TouchableOpacity>
                </LinearGradient>

                {/* Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Template Cards */}
                    {templates.map((tpl, index) => {
                        const isDefault = tpl.id === defaultId;
                        const previewSubject = fillTemplate(tpl.subject, contactData);
                        const previewBody = fillTemplate(tpl.body, contactData);

                        return (
                            <TemplateCard
                                key={tpl.id}
                                tpl={tpl}
                                isDefault={isDefault}
                                previewSubject={previewSubject}
                                previewBody={previewBody}
                                onPress={() => handleSelect(tpl)}
                                theme={theme}
                                index={index}
                            />
                        );
                    })}

                    {/* Empty state */}
                    {templates.length === 0 && (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconBox, { backgroundColor: DS.accentLight }]}>
                                <FileText size={28} color={DS.primary} strokeWidth={1.5} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Templates Yet</Text>
                            <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                                Save reusable templates in Settings to speed up your outreach.
                            </Text>
                        </View>
                    )}

                    {templates.length > 0 && (
                        <View style={[styles.sectionDivider, { backgroundColor: theme.cardBorder }]} />
                    )}

                    {/* Write from Scratch */}
                    <TouchableOpacity
                        style={[styles.scratchCard, { borderColor: DS.primary }]}
                        onPress={onBlank}
                        activeOpacity={0.72}
                    >
                        <View style={[styles.scratchIconBox, { backgroundColor: DS.accentLight }]}>
                            <Edit3 size={18} color={DS.primaryDark} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.scratchTitle, { color: theme.text }]}>Write from Scratch</Text>
                            <Text style={[styles.scratchDesc, { color: theme.textMuted }]}>
                                Start with a blank email
                            </Text>
                        </View>
                        <ChevronRight size={16} color={theme.textMuted} strokeWidth={2} />
                    </TouchableOpacity>

                    <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
                </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

// ─── Template Card with Stagger Animation ────────────────────────────────────
function TemplateCard({ tpl, isDefault, previewSubject, previewBody, onPress, theme, index }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 280,
                delay: index * 65,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 280,
                delay: index * 65,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.templateCard,
                    {
                        backgroundColor: theme.card,
                        borderColor: isDefault ? DS.accent : theme.cardBorder,
                        borderWidth: isDefault ? 2 : 1,
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.72}
            >
                {/* Left accent bar */}
                <View
                    style={[
                        styles.templateAccentBar,
                        { backgroundColor: isDefault ? DS.accent : DS.primary },
                    ]}
                />

                <View style={styles.templateCardInner}>
                    {/* Header row */}
                    <View style={styles.templateCardHeader}>
                        <Text
                            style={[styles.templateName, { color: theme.text }]}
                            numberOfLines={1}
                        >
                            {tpl.name}
                        </Text>
                        {isDefault ? (
                            <View style={styles.defaultBadge}>
                                <Check size={10} color={DS.primaryDark} strokeWidth={3} />
                                <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Subject preview */}
                    <Text
                        style={[styles.previewSubject, { color: theme.textSecondary }]}
                        numberOfLines={1}
                    >
                        {previewSubject || '(no subject)'}
                    </Text>

                    {/* Body preview */}
                    <Text
                        style={[styles.previewBody, { color: theme.textMuted }]}
                        numberOfLines={2}
                    >
                        {previewBody || '(no body)'}
                    </Text>
                </View>

                <View style={styles.templateChevronBox}>
                    <ChevronRight size={16} color={theme.textMuted} strokeWidth={2} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Single root container inside Modal
    modalRoot: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: SHEET_HEIGHT,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },

    // Drag handle
    dragHandleWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        alignItems: 'center',
        paddingTop: 10,
    },
    dragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },

    // Header
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 18,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(176,236,112,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: DS.textOnDark,
        letterSpacing: -0.3,
    },
    sheetSubtitle: {
        fontSize: 12,
        color: DS.textOnDarkMuted,
        marginTop: 1,
        fontWeight: '400',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Scroll
    scrollView: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // Template card
    templateCard: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 16,
        marginBottom: 10,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    templateAccentBar: {
        width: 4,
    },
    templateCardInner: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    templateCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 8,
    },
    templateName: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        letterSpacing: -0.2,
    },
    defaultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: DS.accent,
        borderRadius: 9999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    defaultBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: DS.primaryDark,
    },
    previewSubject: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 4,
    },
    previewBody: {
        fontSize: 12,
        lineHeight: 17,
    },
    templateChevronBox: {
        paddingRight: 14,
        justifyContent: 'center',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: 24,
        gap: 12,
    },
    emptyIconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    emptyDesc: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
    },

    // Divider
    sectionDivider: {
        height: 1,
        marginVertical: 14,
        borderRadius: 1,
        opacity: 0.6,
    },

    // Write from scratch
    scratchCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    scratchIconBox: {
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scratchTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    scratchDesc: {
        fontSize: 12,
        marginTop: 2,
    },
});
