/**
 * ProgressSteps — Premium animated search pipeline indicator
 * §2.1 DS tokens inline (no useTheme). Spinner ring + vertical step list.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

const C = {
    primaryDark:  '#144516',
    accent:       '#B0EC70',
    accentLight:  'rgba(176,236,112,0.15)',
    surfaceLight: '#D7E2D6',
    white:        '#FFFFFF',
    textPrimary:  '#1A1A1A',
    textSecondary:'#6B7B6E',
    success:      '#4CAF50',
    primary:      '#416943',
};

function Step({ label, index, currentStep, isLast }) {
    const isCompleted = index < currentStep;
    const isActive    = index === currentStep;
    const pulseAnim   = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActive) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1,    duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
        pulseAnim.setValue(1);
    }, [isActive]);

    return (
        <View style={step.wrap}>
            {/* Left track: dot + vertical connector */}
            <View style={step.track}>
                <View style={[step.dot, isCompleted && step.dotDone, isActive && step.dotActive]}>
                    {isCompleted
                        ? <Text style={step.check}>✓</Text>
                        : isActive
                        ? <Animated.View style={[step.innerDot, { opacity: pulseAnim }]} />
                        : <View style={step.pendingCore} />
                    }
                </View>
                {!isLast && (
                    <View style={[step.connector, isCompleted && step.connectorDone]} />
                )}
            </View>

            {/* Right body: label + status */}
            <View style={[step.body, isLast && { paddingBottom: 0 }]}>
                <Text style={[
                    step.label,
                    isCompleted && step.labelDone,
                    isActive    && step.labelActive,
                ]}>
                    {label}
                </Text>
                {isActive    && <Text style={step.statusRunning}>Running…</Text>}
                {isCompleted && <Text style={step.statusComplete}>Complete</Text>}
            </View>
        </View>
    );
}

export default function ProgressSteps({ steps, currentStep }) {
    const spinAnim  = useRef(new Animated.Value(0)).current;
    const enterAnim = useRef(new Animated.Value(0)).current;
    const enterY    = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        // Continuous spinner rotation
        Animated.loop(
            Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
        ).start();
        // Card entrance
        Animated.parallel([
            Animated.timing(enterAnim, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            Animated.timing(enterY,    { toValue: 0, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start();
    }, []);

    if (currentStep < 0) return null;

    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <Animated.View style={[styles.card, { opacity: enterAnim, transform: [{ translateY: enterY }] }]}>
            {/* Lime top accent line */}
            <View style={styles.topAccent} />

            {/* Header row */}
            <View style={styles.cardHeader}>
                {/* Spinner ring: partial border + rotation = loading arc */}
                <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]} />
                <View>
                    <Text style={styles.headingLabel}>SCANNING</Text>
                    <Text style={styles.headingSub}>Discovering contacts…</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Step list */}
            <View style={styles.stepsArea}>
                {steps.map((s, i) => (
                    <Step
                        key={i}
                        label={s}
                        index={i}
                        currentStep={currentStep}
                        isLast={i === steps.length - 1}
                    />
                ))}
            </View>
        </Animated.View>
    );
}

// ─── Step sub-styles ──────────────────────────────────────────────────────────
const step = StyleSheet.create({
    wrap:  { flexDirection: 'row', minHeight: 40 },
    track: { width: 28, alignItems: 'center' },
    dot: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: C.surfaceLight,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'transparent',
    },
    dotDone:   { backgroundColor: C.primaryDark, borderColor: C.primaryDark },
    dotActive: { backgroundColor: C.accentLight, borderColor: C.accent },
    check:     { color: C.white, fontSize: 10, fontWeight: '800' },
    innerDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
    pendingCore: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.textSecondary, opacity: 0.35 },
    connector: { flex: 1, width: 2, backgroundColor: C.surfaceLight, marginVertical: 2 },
    connectorDone: { backgroundColor: C.primaryDark },

    body:  { flex: 1, paddingLeft: 12, paddingBottom: 14, paddingTop: 1 },
    label:        { fontSize: 14, fontWeight: '500', color: C.textSecondary },
    labelDone:    { opacity: 0.5 },
    labelActive:  { color: C.textPrimary, fontWeight: '700' },
    statusRunning: { fontSize: 11, marginTop: 3, color: C.primary, fontWeight: '500' },
    statusComplete:{ fontSize: 11, marginTop: 3, color: C.success, fontWeight: '500' },
});

// ─── Card styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    card: {
        borderRadius: 16, backgroundColor: C.white,
        borderWidth: 1, borderColor: C.surfaceLight,
        overflow: 'hidden', marginBottom: 24,
        shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 }, elevation: 4,
    },
    topAccent: { height: 3, backgroundColor: C.accent },
    cardHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 16, paddingVertical: 16,
    },
    // Spinner: partial border ring that rotates
    spinnerRing: {
        width: 30, height: 30, borderRadius: 15,
        borderWidth: 2.5,
        borderColor: C.surfaceLight,
        borderTopColor: C.accent,
    },
    headingLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: C.primaryDark },
    headingSub:   { fontSize: 13, color: C.textSecondary, marginTop: 2 },
    divider: { height: 1, backgroundColor: C.surfaceLight, marginHorizontal: 16 },
    stepsArea: { padding: 16, paddingTop: 14 },
});
