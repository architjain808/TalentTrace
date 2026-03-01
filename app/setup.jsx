import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveSecureKey } from '../services/storage';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

// ─── Main Setup Screen ─────────────────────────────────────────
export default function SetupScreen() {
    const router = useRouter();
    const { theme } = useTheme();
    const [page, setPage] = useState(0);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);

    // Fade animation
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const switchPage = (nextPage) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setPage(nextPage);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    // Staggered timeline animation for page 2
    const timelineAnims = useRef(
        Array.from({ length: 6 }, () => new Animated.Value(0))
    ).current;

    useEffect(() => {
        if (page !== 1) return;
        timelineAnims.forEach((a) => a.setValue(0));
        const animations = timelineAnims.map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: i * 200,
                useNativeDriver: true,
            })
        );
        Animated.stagger(150, animations).start();
    }, [page]);

    const handlePage1Next = async () => {
        const serper = values.SERPER_API_KEY?.trim();
        const openrouter = values.OPENROUTER_API_KEY?.trim();
        if (!serper || !openrouter) {
            showToast('error', 'Required', 'Both API keys are required to continue.');
            return;
        }
        setSaving(true);
        try {
            await saveSecureKey('SERPER_API_KEY', serper);
            await saveSecureKey('OPENROUTER_API_KEY', openrouter);
            switchPage(1);
        } catch {
            showToast('error', 'Error', 'Failed to save keys.');
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        setSaving(true);
        try {
            const serviceId = values.EMAILJS_SERVICE_ID?.trim();
            const templateId = values.EMAILJS_TEMPLATE_ID?.trim();
            const publicKey = values.EMAILJS_PUBLIC_KEY?.trim();
            const privateKey = values.EMAILJS_PRIVATE_KEY?.trim();
            if (serviceId) await saveSecureKey('EMAILJS_SERVICE_ID', serviceId);
            if (templateId) await saveSecureKey('EMAILJS_TEMPLATE_ID', templateId);
            if (publicKey) await saveSecureKey('EMAILJS_PUBLIC_KEY', publicKey);
            if (privateKey) await saveSecureKey('EMAILJS_PRIVATE_KEY', privateKey);
            showToast('success', 'Setup Complete!', 'You\'re ready to find HR contacts.');
            router.replace('/');
        } catch {
            showToast('error', 'Error', 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        showToast('info', 'Skipped', 'You can set up EmailJS later in Settings.');
        router.replace('/');
    };

    const updateValue = (key, val) => setValues((p) => ({ ...p, [key]: val }));

    const openLink = (url) => Linking.openURL(url);

    // Timeline step component
    const TimelineStep = ({ index, number, icon, title, desc, isLast }) => {
        const anim = timelineAnims[index] || new Animated.Value(1);
        return (
            <Animated.View
                style={[
                    styles.timelineItem,
                    {
                        opacity: anim,
                        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                    },
                ]}
            >
                <View style={styles.timelineLeft}>
                    <View style={[styles.timelineNumber, { backgroundColor: theme.accent }]}>
                        <Text style={styles.timelineNumberText}>{number}</Text>
                    </View>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.accent + '40' }]} />}
                </View>
                <View style={[styles.timelineContent, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                    <View style={styles.timelineHeader}>
                        <Text style={styles.timelineIcon}>{icon}</Text>
                        <Text style={[styles.timelineTitle, { color: theme.text }]}>{title}</Text>
                    </View>
                    <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>{desc}</Text>
                </View>
            </Animated.View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
                {page === 0 ? (
                    /* ═══ PAGE 1: Core API Keys ═══ */
                    <ScrollView
                        contentContainerStyle={styles.pageContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.headerArea}>
                            <Text style={styles.logoIcon}>⚡</Text>
                            <Text style={[styles.title, { color: theme.text }]}>TalentTrace Setup</Text>
                            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                                Step 1 of 2 — Core API Keys
                            </Text>
                        </View>

                        <View style={styles.progressRow}>
                            <View style={[styles.progressBar, { backgroundColor: theme.accent }]} />
                            <View style={[styles.progressBar, { backgroundColor: theme.border }]} />
                        </View>

                        {/* Serper */}
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            <Text style={styles.cardIcon}>🔍</Text>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>Google Search API</Text>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                                Searches for company domains & HR contacts
                            </Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.SERPER_API_KEY || ''}
                                onChangeText={(v) => updateValue('SERPER_API_KEY', v)}
                                placeholder="Enter Serper API key..."
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                            />
                            <TouchableOpacity onPress={() => openLink('https://serper.dev')} activeOpacity={0.7}>
                                <Text style={[styles.linkText, { color: theme.accent }]}>🔗 Get your free key at serper.dev →</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Groq AI (Free) */}
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            <Text style={styles.cardIcon}>🤖</Text>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>AI Extraction</Text>
                            <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
                                Extracts contact details from search results
                            </Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.OPENROUTER_API_KEY || ''}
                                onChangeText={(v) => updateValue('OPENROUTER_API_KEY', v)}
                                placeholder="Enter OpenRouter API key..."
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                            />
                            <TouchableOpacity onPress={() => openLink('https://openrouter.ai')} activeOpacity={0.7}>
                                <Text style={[styles.linkText, { color: theme.accent }]}>🔗 Get your key at openrouter.ai →</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: theme.accent }, saving && { opacity: 0.7 }]}
                            onPress={handlePage1Next}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.primaryBtnText}>Next → Set Up Email Sending</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    /* ═══ PAGE 2: EmailJS Tutorial + Keys ═══ */
                    <ScrollView
                        contentContainerStyle={styles.pageContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.headerArea}>
                            <Text style={styles.logoIcon}>📧</Text>
                            <Text style={[styles.title, { color: theme.text }]}>Email Setup</Text>
                            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                                Step 2 of 2 — Follow these steps to send cold emails
                            </Text>
                        </View>

                        <View style={styles.progressRow}>
                            <View style={[styles.progressBar, { backgroundColor: theme.accent }]} />
                            <View style={[styles.progressBar, { backgroundColor: theme.accent }]} />
                        </View>

                        {/* ─── Timeline Tutorial ─── */}
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>📖 How to Set Up EmailJS</Text>

                        <TimelineStep
                            index={0} number="1" icon="🌐"
                            title="Create an Account"
                            desc="Go to emailjs.com and sign up for free. You get 200 emails/month on the free plan."
                        />
                        <TimelineStep
                            index={1} number="2" icon="🔗"
                            title="Add Email Service"
                            desc='In your dashboard, go to "Email Services" → "Add New Service". Connect your Gmail or Outlook.'
                        />
                        <TimelineStep
                            index={2} number="3" icon="📝"
                            title="Create a Template"
                            desc='Go to "Email Templates" → "Create New". Use {{to_email}}, {{to_name}}, {{company}}, and {{role}} as template variables.'
                        />
                        <TimelineStep
                            index={3} number="4" icon="⚙️"
                            title="Enable API Access"
                            desc='Go to "Account" → "Security". Toggle ON "Allow EmailJS API for non-browser applications". This is required for mobile apps.'
                        />
                        <TimelineStep
                            index={4} number="5" icon="🔑"
                            title="Copy Your Keys"
                            desc="Service ID → from Email Services page. Template ID → from Email Templates page. Public Key → Account → General. Private Key → Account → Security."
                        />
                        <TimelineStep
                            index={5} number="6" icon="✅"
                            title="You're All Set!"
                            desc="Paste your 4 keys below and start sending professional cold emails to HR contacts."
                            isLast
                        />

                        <TouchableOpacity onPress={() => openLink('https://www.emailjs.com/docs/rest-api/send/')} activeOpacity={0.7}>
                            <Text style={[styles.docsLink, { color: theme.accent }]}>📚 EmailJS API Documentation →</Text>
                        </TouchableOpacity>

                        {/* ─── EmailJS Key Inputs ─── */}
                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 28 }]}>🔐 Enter Your Keys</Text>

                        <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                            <Text style={[styles.inputLabel, { color: theme.text }]}>Service ID</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.EMAILJS_SERVICE_ID || ''}
                                onChangeText={(v) => updateValue('EMAILJS_SERVICE_ID', v)}
                                placeholder="e.g. service_abc123"
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Template ID</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.EMAILJS_TEMPLATE_ID || ''}
                                onChangeText={(v) => updateValue('EMAILJS_TEMPLATE_ID', v)}
                                placeholder="e.g. template_xyz789"
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Public Key</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.EMAILJS_PUBLIC_KEY || ''}
                                onChangeText={(v) => updateValue('EMAILJS_PUBLIC_KEY', v)}
                                placeholder="Account → General → Public Key"
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Private Key</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                value={values.EMAILJS_PRIVATE_KEY || ''}
                                onChangeText={(v) => updateValue('EMAILJS_PRIVATE_KEY', v)}
                                placeholder="Account → Security → Private Key"
                                placeholderTextColor={theme.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                secureTextEntry
                            />

                            <View style={[styles.infoBox, { backgroundColor: theme.accentLight }]}>
                                <Text style={[styles.infoText, { color: theme.accent }]}>
                                    💡 Private Key is required for mobile apps. Make sure "Allow EmailJS API for non-browser apps" is enabled in your EmailJS Security settings.
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: theme.accent }, saving && { opacity: 0.7 }]}
                            onPress={handleFinish}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.primaryBtnText}>🚀 Start Using TalentTrace</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
                            <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip for now — set up later in Settings</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    animatedContainer: { flex: 1 },
    pageContent: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 56 : 60,
        paddingBottom: 40,
    },
    headerArea: { alignItems: 'center', marginBottom: 20 },
    logoIcon: { fontSize: 44, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800' },
    subtitle: { fontSize: 14, fontWeight: '500', marginTop: 2, textAlign: 'center' },

    progressRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
    progressBar: { flex: 1, height: 4, borderRadius: 2 },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

    // Page 1 card styles
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
    },
    cardIcon: { fontSize: 36, marginBottom: 8 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    cardDesc: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },

    // Inputs
    input: {
        alignSelf: 'stretch',
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        marginBottom: 12,
    },
    inputLabel: {
        alignSelf: 'stretch',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 4,
    },
    inputCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
    },
    linkText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    docsLink: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 4 },

    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    skipBtn: { alignItems: 'center', paddingVertical: 16 },
    skipText: { fontSize: 14, fontWeight: '500' },

    // Timeline styles
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 36,
        marginRight: 12,
    },
    timelineNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    timelineNumberText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 2,
    },
    timelineContent: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    timelineIcon: { fontSize: 18 },
    timelineTitle: { fontSize: 15, fontWeight: '700' },
    timelineDesc: { fontSize: 13, lineHeight: 19 },

    infoBox: {
        borderRadius: 10,
        padding: 12,
        marginTop: 4,
    },
    infoText: { fontSize: 13, lineHeight: 18 },
});
