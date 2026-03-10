import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import EmailCard from './EmailCard';
import { useTheme } from '../constants/theme';

export default function ResultsTable({ results, company, onSend, roleContext }) {
    const { theme } = useTheme();
    const [sendingAll, setSendingAll] = useState(false);
    const [allSent, setAllSent] = useState(false);

    const handleSendAll = async () => {
        setSendingAll(true);
        try {
            for (const contact of results) {
                await onSend({ toEmail: contact.email, toName: contact.name, company, role: contact.role });
            }
            setAllSent(true);
        } catch { } finally { setSendingAll(false); }
    };

    if (!results || results.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Results: {company}</Text>
                <View style={[styles.countBadge, { backgroundColor: theme.accentLight }]}>
                    <Text style={[styles.countText, { color: theme.accent }]}>{results.length} found</Text>
                </View>
            </View>

            {roleContext && (
                <View style={[styles.contextBanner, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
                    <Text style={styles.contextIcon}>{roleContext.icon}</Text>
                    <Text style={[styles.contextText, { color: theme.accent }]}>
                        Showing {roleContext.resultLabel} for your{' '}
                        <Text style={styles.contextBold}>{roleContext.label}</Text> profile
                    </Text>
                </View>
            )}

            <FlatList
                data={results}
                keyExtractor={(item, i) => `${item.email}-${i}`}
                renderItem={({ item }) => <EmailCard contact={item} onSend={onSend} company={company} />}
                scrollEnabled={false}
            />

            {results.length > 1 && (
                <TouchableOpacity
                    style={[styles.sendAllBtn, { backgroundColor: theme.accent }, allSent && { backgroundColor: theme.success }]}
                    onPress={handleSendAll}
                    disabled={sendingAll || allSent}
                    activeOpacity={0.8}
                >
                    {sendingAll ? <ActivityIndicator size="small" color="#fff" /> : (
                        <Text style={styles.sendAllText}>{allSent ? '✓ All Sent' : `Send to All (${results.length})`}</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 17, fontWeight: '700' },
    countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
    countText: { fontSize: 13, fontWeight: '600' },
    contextBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 12,
        gap: 6,
    },
    contextIcon: { fontSize: 13 },
    contextText: { fontSize: 12, fontWeight: '500', flex: 1 },
    contextBold: { fontWeight: '700' },
    sendAllBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    sendAllText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
