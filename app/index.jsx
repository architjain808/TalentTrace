import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import SearchBar from '../components/SearchBar';
import ProgressSteps from '../components/ProgressSteps';
import ResultsTable from '../components/ResultsTable';
import DirectSend from '../components/DirectSend';
import { useSearch } from '../hooks/useSearch';
import { sendColdEmail } from '../services/mailer';
import { showToast } from '../components/Toast';
import { useTheme } from '../constants/theme';

export default function HomeScreen() {
    const router = useRouter();
    const { theme, isDark, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('search');
    const {
        results, loading, error, currentStep, steps, companyName, search, clearResults,
    } = useSearch();

    const handleSearch = async (company) => {
        const found = await search(company);
        if (found.length > 0) {
            showToast('success', 'Search Complete', `Found ${found.length} HR contact(s)!`);
        }
    };

    const handleSend = async (emailData) => {
        try {
            const result = await sendColdEmail(emailData);
            showToast('success', 'Email Sent!', `Sent to ${emailData.toName}`);
            return result;
        } catch (err) {
            showToast('error', 'Send Failed', err.message || 'Failed to send email.');
            throw err;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
            <StatusBar style={theme.statusBar} />

            {/* Header — pushed down for mobile safe area */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text }]}>TalentTrace</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.7}>
                        <Text style={styles.iconText}>{isDark ? '☀️' : '🌙'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn} activeOpacity={0.7}>
                        <Text style={styles.iconText}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'search' && { backgroundColor: theme.accent }]}
                    onPress={() => setActiveTab('search')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'search' ? '#fff' : theme.textSecondary }]}>Find Contacts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'direct' && { backgroundColor: theme.accent }]}
                    onPress={() => setActiveTab('direct')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'direct' ? '#fff' : theme.textSecondary }]}>Direct Seend</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {activeTab === 'search' ? (
                    <>
                        <SearchBar onSearch={handleSearch} loading={loading} />

                        {loading && <ProgressSteps steps={steps} currentStep={currentStep} />}

                        {error && !loading && (
                            <View style={[styles.errorBox, { backgroundColor: theme.errorBg, borderColor: theme.error }]}>
                                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
                                <TouchableOpacity onPress={clearResults} activeOpacity={0.7}>
                                    <Text style={[styles.dismissText, { color: theme.error }]}>Dismiss</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {!loading && results.length > 0 && (
                            <ResultsTable results={results} company={companyName} onSend={handleSend} />
                        )}

                        {!loading && results.length === 0 && !error && currentStep < 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>🏢</Text>
                                <Text style={[styles.emptyTitle, { color: theme.text }]}>Find HR Contacts</Text>
                                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                                    Enter a company name to find HR emails, verify them, and send cold emails — all from your device.
                                </Text>
                                <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                                    {[
                                        ['🔍', 'Google-powered search'],
                                        ['🤖', 'AI-powered extraction'],
                                        ['✅', 'Email verification on send'],
                                        ['📧', 'One-click sending'],
                                    ].map(([icon, label], i) => (
                                        <View key={i} style={[styles.featureRow, i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
                                            <Text style={styles.featureIcon}>{icon}</Text>
                                            <Text style={[styles.featureLabel, { color: theme.textSecondary }]}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </>
                ) : (
                    <DirectSend onSend={handleSend} />
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 48 : 12,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconBtn: { padding: 8, borderRadius: 20 },
    iconText: { fontSize: 20 },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 4,
        borderRadius: 10,
        borderWidth: 1,
        padding: 4
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    tabText: { fontSize: 14, fontWeight: '600' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    errorBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
        gap: 8,
    },
    errorText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    dismissText: { fontSize: 13, fontWeight: '600', marginTop: 4 },
    emptyState: { alignItems: 'center', paddingTop: 32 },
    emptyIcon: { fontSize: 52, marginBottom: 12 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    emptyDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 10 },
    featureCard: { borderRadius: 14, borderWidth: 1, alignSelf: 'stretch', overflow: 'hidden' },
    featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
    featureIcon: { fontSize: 18 },
    featureLabel: { fontSize: 15, fontWeight: '500' },
});
