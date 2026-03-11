/**
 * Send Screen — Direct email compose
 * Light mode only. Safe area insets for Android top spacing.
 */
import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send as SendIcon } from 'lucide-react-native';
import DirectSend from '../../components/DirectSend';
import { sendColdEmail } from '../../services/mailer';
import { showToast } from '../../components/Toast';

const C = {
    primaryDark:  '#144516',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textSecondary:'#6B7B6E',
};

export default function SendScreen() {
    const insets = useSafeAreaInsets();

    const headerAnim = useRef(new Animated.Value(0)).current;
    const headerY    = useRef(new Animated.Value(-10)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(headerAnim, { toValue: 1, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
            Animated.timing(headerY,    { toValue: 0, duration: 350, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
        ]).start();
    }, []);

    const handleSend = async (emailData) => {
        try {
            const result = await sendColdEmail(emailData);
            showToast('success', 'Email Sent', `Sent to ${emailData.toName || emailData.toEmail}`);
            return result;
        } catch (err) {
            showToast('error', 'Send Failed', err.message || 'Failed to send email.');
            throw err;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <Animated.View
                style={[
                    styles.header,
                    { opacity: headerAnim, transform: [{ translateY: headerY }] },
                ]}
            >
                <View style={styles.headerIconBox}>
                    <SendIcon size={20} color={C.primaryDark} strokeWidth={1.5} />
                </View>
                <View>
                    <Text style={styles.headerTitle}>Direct Send</Text>
                    <Text style={styles.headerSub}>Email a contact you already know</Text>
                </View>
            </Animated.View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <DirectSend onSend={handleSend} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.white },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: C.surfaceLight,
        gap: 14,
    },
    headerIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: C.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: C.primaryDark, letterSpacing: -0.3 },
    headerSub:   { fontSize: 12, fontWeight: '500', color: C.textSecondary, marginTop: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
});
