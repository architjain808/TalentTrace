import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

export default function SettingsForm({
    settings,
    onUpdate,
    onSave,
    onPickResume,
    saving,
}) {
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionTitle}>Email Template</Text>

                <Text style={styles.label}>Subject</Text>
                <TextInput
                    style={styles.input}
                    value={settings.subject}
                    onChangeText={(val) => onUpdate({ subject: val })}
                    placeholder="Email subject..."
                    placeholderTextColor="#64748b"
                />

                <Text style={styles.label}>Body</Text>
                <TextInput
                    style={[styles.input, styles.bodyInput]}
                    value={settings.body}
                    onChangeText={(val) => onUpdate({ body: val })}
                    placeholder="Email body..."
                    placeholderTextColor="#64748b"
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                />

                <View style={styles.variableHint}>
                    <Text style={styles.hintIcon}>💡</Text>
                    <Text style={styles.hintText}>
                        Use {'{{name}}'}, {'{{company}}'}, {'{{role}}'} as template variables
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Resume</Text>
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={onPickResume}
                    activeOpacity={0.8}
                >
                    <Text style={styles.uploadIcon}>📎</Text>
                    <Text style={styles.uploadText}>
                        {settings.resumeName || 'Upload PDF'}
                    </Text>
                </TouchableOpacity>
                {settings.resumeName && (
                    <View style={styles.resumeInfo}>
                        <Text style={styles.resumeCheck}>✅</Text>
                        <Text style={styles.resumeName}>{settings.resumeName}</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.savingButton]}
                    onPress={onSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveText}>💾 Save Settings</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f1f5f9',
        marginBottom: 14,
        marginTop: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 6,
        marginTop: 4,
    },
    input: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#f1f5f9',
        marginBottom: 12,
    },
    bodyInput: {
        minHeight: 160,
        paddingTop: 12,
    },
    variableHint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        gap: 8,
    },
    hintIcon: {
        fontSize: 14,
    },
    hintText: {
        fontSize: 13,
        color: '#818cf8',
        flex: 1,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 10,
        borderStyle: 'dashed',
    },
    uploadIcon: {
        fontSize: 18,
    },
    uploadText: {
        fontSize: 15,
        color: '#94a3b8',
        fontWeight: '500',
    },
    resumeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    resumeCheck: {
        fontSize: 14,
    },
    resumeName: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#6366f1',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    savingButton: {
        opacity: 0.7,
    },
    saveText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
