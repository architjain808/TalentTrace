import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../constants/theme';

export default function SearchBar({ onSearch, loading }) {
    const [query, setQuery] = useState('');
    const { theme } = useTheme();

    const handleSearch = () => {
        const trimmed = query.trim();
        if (trimmed && !loading) onSearch(trimmed);
    };

    return (
        <View style={styles.container}>
            <View style={[styles.inputRow, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={styles.icon}>🔍</Text>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter company name..."
                    placeholderTextColor={theme.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    editable={!loading}
                    autoCapitalize="words"
                    autoCorrect={false}
                />
                {query.length > 0 && !loading && (
                    <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                        <Text style={[styles.clearText, { color: theme.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: theme.accent }, (loading || !query.trim()) && { opacity: 0.5 }]}
                onPress={handleSearch}
                disabled={loading || !query.trim()}
                activeOpacity={0.8}
            >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={styles.searchBtnText}>Search</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 10 },
    icon: { fontSize: 16, marginRight: 8 },
    input: { flex: 1, fontSize: 16, paddingVertical: 13, fontWeight: '500' },
    clearBtn: { padding: 6 },
    clearText: { fontSize: 16, fontWeight: '600' },
    searchBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
