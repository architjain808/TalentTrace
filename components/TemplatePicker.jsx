import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { useTheme } from '../constants/theme';
import { getEmailTemplates, getDefaultTemplateId, fillTemplate } from '../services/storage';

/**
 * TemplatePicker — modal popup to select an email template before sending
 *
 * Props:
 * - visible: boolean
 * - onSelect: (template) => void  — called with the selected template object
 * - onBlank: () => void  — called when user chooses "Use Blank"
 * - onClose: () => void
 * - contactData: { name, company, role, email } for variable preview
 */
export default function TemplatePicker({ visible, onSelect, onBlank, onClose, contactData = {} }) {
    const { theme } = useTheme();
    const [templates, setTemplates] = useState([]);
    const [defaultId, setDefaultId] = useState(null);

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        const loaded = await getEmailTemplates();
        const defId = await getDefaultTemplateId();
        setTemplates(loaded);
        setDefaultId(defId);
    };

    const handleSelect = (template) => {
        // Fill variables with contact data before passing back
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
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.bg }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.title, { color: theme.text }]}>Choose Template</Text>
                        <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                            <Text style={[styles.closeBtn, { color: theme.textMuted }]}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {/* Template cards */}
                        {templates.map((tpl) => {
                            const isDefault = tpl.id === defaultId;
                            const previewSubject = fillTemplate(tpl.subject, contactData);
                            const previewBody = fillTemplate(tpl.body, contactData);

                            return (
                                <TouchableOpacity
                                    key={tpl.id}
                                    style={[
                                        styles.templateCard,
                                        { backgroundColor: theme.card, borderColor: isDefault ? theme.accent : theme.cardBorder },
                                        isDefault && { borderWidth: 2 },
                                    ]}
                                    onPress={() => handleSelect(tpl)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.templateHeader}>
                                        <Text style={[styles.templateName, { color: theme.text }]}>{tpl.name}</Text>
                                        {isDefault && (
                                            <View style={[styles.defaultBadge, { backgroundColor: theme.accentLight }]}>
                                                <Text style={[styles.defaultBadgeText, { color: theme.accent }]}>Default</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[styles.previewSubject, { color: theme.textSecondary }]} numberOfLines={1}>
                                        Subject: {previewSubject || '(none)'}
                                    </Text>
                                    <Text style={[styles.previewBody, { color: theme.textMuted }]} numberOfLines={2}>
                                        {previewBody || '(no body)'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}

                        {templates.length === 0 && (
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                                No templates saved yet. Go to Settings to create templates.
                            </Text>
                        )}

                        {/* Use Blank option */}
                        <TouchableOpacity
                            style={[styles.blankCard, { borderColor: theme.border }]}
                            onPress={onBlank}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.blankIcon}>📝</Text>
                            <View>
                                <Text style={[styles.blankTitle, { color: theme.text }]}>Write from Scratch</Text>
                                <Text style={[styles.blankDesc, { color: theme.textMuted }]}>Compose a custom email without a template</Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 30 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 18, fontWeight: '700' },
    closeBtn: { fontSize: 22, fontWeight: '300', padding: 4 },
    list: { paddingHorizontal: 20, paddingTop: 12 },
    templateCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
    templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    templateName: { fontSize: 16, fontWeight: '600' },
    defaultBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    defaultBadgeText: { fontSize: 11, fontWeight: '700' },
    previewSubject: { fontSize: 13, marginBottom: 4 },
    previewBody: { fontSize: 13, lineHeight: 18 },
    emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 30 },
    blankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        gap: 12,
    },
    blankIcon: { fontSize: 24 },
    blankTitle: { fontSize: 15, fontWeight: '600' },
    blankDesc: { fontSize: 12, marginTop: 2 },
});
