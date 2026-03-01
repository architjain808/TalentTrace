import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../constants/theme';

function StepItem({ label, index, currentStep }) {
    const { theme } = useTheme();
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActive) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        } else { pulseAnim.setValue(1); }
    }, [isActive]);

    const dotColor = isCompleted ? theme.success : isActive ? theme.accent : theme.border;
    const labelColor = isCompleted ? theme.success : isActive ? theme.text : theme.textMuted;

    return (
        <View style={styles.stepRow}>
            <Animated.View style={[styles.dot, { backgroundColor: dotColor }, isActive && { opacity: pulseAnim }]}>
                {isCompleted && <Text style={styles.check}>✓</Text>}
            </Animated.View>
            <Text style={[styles.label, { color: labelColor }, isActive && { fontWeight: '600' }]}>{label}</Text>
        </View>
    );
}

export default function ProgressSteps({ steps, currentStep }) {
    const { theme } = useTheme();
    if (currentStep < 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {steps.map((step, i) => (
                <StepItem key={i} label={step} index={i} currentStep={currentStep} />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
    stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
    dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    check: { color: '#fff', fontSize: 12, fontWeight: '700' },
    label: { fontSize: 14, fontWeight: '500' },
});
