/**
 * ResultsTable — displays search results
 * Design system: lime count badge, lime Send All pill, proper card layout
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import EmailCard from './EmailCard';

const C = {
    primaryDark:  '#144516',
    primary:      '#416943',
    accent:       '#B0EC70',
    accentLight:  'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    success:      '#4CAF50',
    successBg:    '#E8F5E9',
};

export default function ResultsTable({ results, company, onSend, roleContext }) {
    const [sendingAll, setSendingAll] = useState(false);
    const [allSent, setAllSent]       = useState(false);

    const handleSendAll = async () => {
        setSendingAll(true);
        try {
            for (const contact of results) {
                await onSend({ toEmail: contact.email, toName: contact.name, company, role: contact.role });
            }
            setAllSent(true);
        } catch { }
        finally { setSendingAll(false); }
    };

    if (!results || results.length === 0) return null;

    return (
        <View style={styles.container}>
            {/* Results header */}
            <View style={styles.header}>
                <View>
                    {/* §3.2 — type-h3: 20px 600 */}
                    <Text style={styles.companyName}>{company}</Text>
                    <Text style={styles.subtitle}>HR contacts found</Text>
                </View>
                {/* §6.2 — Count badge: lime pill */}
                <View style={styles.countBadge}>
                    <Text style={styles.countNum}>{results.length}</Text>
                    <Text style={styles.countLabel}>found</Text>
                </View>
            </View>

            {/* Role context banner */}
            {roleContext && (
                <View style={styles.contextBanner}>
                    <View style={styles.contextDot} />
                    <Text style={styles.contextText}>
                        Filtered for your{' '}
                        <Text style={styles.contextBold}>{roleContext.label}</Text> profile
                    </Text>
                </View>
            )}

            {/* Separator before cards */}
            <View style={styles.divider} />

            {/* Contact cards */}
            <FlatList
                data={results}
                keyExtractor={(item, i) => `${item.email}-${i}`}
                renderItem={({ item }) => (
                    <EmailCard contact={item} onSend={onSend} company={company} />
                )}
                scrollEnabled={false}
            />

            {/* Send All — shown when 2+ contacts */}
            {results.length > 1 && (
                <TouchableOpacity
                    style={[
                        styles.sendAllBtn,
                        allSent && styles.sendAllBtnSent,
                        (sendingAll || allSent) && { opacity: 0.8 },
                    ]}
                    onPress={handleSendAll}
                    disabled={sendingAll || allSent}
                    activeOpacity={0.85}
                    accessibilityLabel={allSent ? 'All emails sent' : `Send to all ${results.length} contacts`}
                >
                    {sendingAll
                        ? <ActivityIndicator size="small" color={C.primaryDark} />
                        : <Text style={[styles.sendAllText, allSent && styles.sendAllTextSent]}>
                            {allSent ? 'All Sent' : `Send to All (${results.length})`}
                          </Text>
                    }
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 4 },

    // Header: company name + count badge
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 10,
    },
    companyName: { fontSize: 20, fontWeight: '700', color: C.primaryDark, letterSpacing: -0.4 },
    subtitle:   { fontSize: 12, marginTop: 2, color: C.textSecondary },

    // §2.1 — Count badge in lime accent
    countBadge: {
        borderRadius: 9999, paddingHorizontal: 14, paddingVertical: 8,
        alignItems: 'center', backgroundColor: C.accentLight,
        borderWidth: 1, borderColor: 'rgba(176,236,112,0.3)',
    },
    countNum:   { fontSize: 22, fontWeight: '800', color: C.primaryDark, lineHeight: 26 },
    countLabel: { fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.3 },

    // Role context banner
    contextBanner: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.surfaceLight, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 9,
        marginBottom: 12, gap: 8,
    },
    contextDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
    contextText:  { fontSize: 13, fontWeight: '500', color: C.textSecondary, flex: 1 },
    contextBold:  { fontWeight: '700', color: C.textPrimary },

    divider: { height: 1, backgroundColor: C.surfaceLight, marginBottom: 12 },

    // §6.1 — Send All: lime pill CTA
    sendAllBtn: {
        borderRadius: 9999, paddingVertical: 15,
        alignItems: 'center', justifyContent: 'center', marginTop: 4,
        backgroundColor: C.accent,
        shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    },
    sendAllBtnSent: { backgroundColor: C.successBg, shadowColor: C.success, shadowOpacity: 0.15 },
    sendAllText:     { fontSize: 15, fontWeight: '700', color: C.primaryDark, letterSpacing: 0.2 },
    sendAllTextSent: { color: C.success },
});
