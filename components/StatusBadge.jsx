import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

const STATUS_CONFIG = {
    valid: { label: 'Verified', icon: '✓' },
    'catch-all': { label: 'Catch-All', icon: '~' },
    unknown: { label: 'Unknown', icon: '?' },
    unverified: { label: 'Unverified', icon: '○' },
    invalid: { label: 'Invalid', icon: '✕' },
};

export default function StatusBadge({ status }) {
    const { theme } = useTheme();
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

    const colors = {
        valid: { text: theme.success, bg: theme.successBg },
        'catch-all': { text: theme.warning, bg: theme.warningBg },
        unknown: { text: theme.textMuted, bg: theme.bgTertiary },
        unverified: { text: theme.textSecondary, bg: theme.bgTertiary },
        invalid: { text: theme.error, bg: theme.errorBg },
    };

    const c = colors[status] || colors.unknown;

    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={[styles.icon, { color: c.text }]}>{config.icon}</Text>
            <Text style={[styles.label, { color: c.text }]}>{config.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4 },
    icon: { fontSize: 11, fontWeight: '700' },
    label: { fontSize: 12, fontWeight: '600' },
});
