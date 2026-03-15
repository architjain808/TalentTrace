/**
 * Landing Screen — UI Redesign Reference §8.1
 * Premium Nature-Fintech aesthetic: dark hero + lime accent + animated entrance
 */
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Easing,
    Dimensions,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithGoogle } from '../services/googleAuth';
import { getUserProfile } from '../firebase/userCRUD';
import { auth } from '../firebase/config';
import { showToast } from '../components/Toast';

const { width: W, height: H } = Dimensions.get('window');

// §2.1 color tokens
const C = {
    bgDark:      '#0D2E10',
    primaryDark: '#144516',
    primaryMid:  '#1A5C1F',
    accent:      '#B0EC70',
    accentDim:   'rgba(176, 236, 112, 0.12)',
    accentLine:  'rgba(176, 236, 112, 0.3)',
    white:       '#FFFFFF',
    white70:     'rgba(255,255,255,0.7)',
    white50:     'rgba(255,255,255,0.5)',
    white15:     'rgba(255,255,255,0.15)',
};

// §12.1 — Network graph hero illustration (dimensional, edge-to-edge visual)
// Represents TalentTrace's core value: connecting job seekers to HR contacts
// cx=148, cy=145 is the center node position within the 300×290 SVG viewport
const HERO_CENTER_X = 148;
const HERO_CENTER_Y = 145;
const LOGO_SIZE = 80; // fits inside inner circle (r=46 → ⌀92)

function NetworkHero() {
    const cx = HERO_CENTER_X, cy = HERO_CENTER_Y; // central node

    // §12.1 — Satellite contact nodes (positioned organically around center)
    const satellites = [
        { x: 65,  y: 58,  r: 20, label: 'HR' },
        { x: 240, y: 72,  r: 17, label: 'TA' },
        { x: 48,  y: 210, r: 15, label: 'RC' },
        { x: 248, y: 212, r: 18, label: 'HM' },
        { x: 152, y: 22,  r: 13, label: '' },
    ];

    return (
        // §5.3 — large, immersive illustration area
        // View wrapper allows Image overlay positioned over the SVG center node
        <View style={{ width: 300, height: 290 }}>
        <Svg width={300} height={290} viewBox="0 0 300 290" style={StyleSheet.absoluteFill}>
            <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={C.accent} stopOpacity="0.08" />
                    <Stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                </RadialGradient>
            </Defs>

            {/* §12.3 — ambient glow rings for depth */}
            <Circle cx={cx} cy={cy} r={100} fill="url(#glow)" />
            <Circle cx={cx} cy={cy} r={84}  fill="none" stroke={C.accentLine} strokeWidth="0.5" />
            <Circle cx={cx} cy={cy} r={68}  fill="none" stroke={C.accentLine} strokeWidth="0.5" />

            {/* §12.3 — Decorative accent lines (guide eye, create depth) */}
            {satellites.map((s, i) => (
                <Line
                    key={`line-${i}`}
                    x1={cx} y1={cy}
                    x2={s.x} y2={s.y}
                    stroke={C.accentLine}
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                />
            ))}

            {/* Satellite contact nodes — representing HR contacts */}
            {satellites.map((s, i) => (
                <React.Fragment key={`node-${i}`}>
                    <Circle cx={s.x} cy={s.y} r={s.r + 6} fill={C.accentDim} />
                    <Circle cx={s.x} cy={s.y} r={s.r} fill="rgba(20,69,22,0.9)" stroke={C.accent} strokeWidth="1.5" />
                    {s.label ? (
                        <SvgText
                            x={s.x} y={s.y + 4}
                            textAnchor="middle"
                            fill={C.accent}
                            fontSize="9"
                            fontWeight="700"
                        >
                            {s.label}
                        </SvgText>
                    ) : null}
                </React.Fragment>
            ))}

            {/* Central node — brand mark */}
            <Circle cx={cx} cy={cy} r={62} fill="rgba(176,236,112,0.08)" />
            <Circle cx={cx} cy={cy} r={54} fill={C.accent} />
            <Circle cx={cx} cy={cy} r={46} fill={C.primaryDark} />

        </Svg>

        {/* Official logo — light variant, overlaid on the central dark circle */}
        <Image
            source={require('../assets/logo-light.png')}
            style={{
                position: 'absolute',
                width: LOGO_SIZE,
                height: LOGO_SIZE,
                borderRadius: LOGO_SIZE / 2,
                top: HERO_CENTER_Y - LOGO_SIZE / 2,
                left: HERO_CENTER_X - LOGO_SIZE / 2,
            }}
            resizeMode="cover"
            accessibilityLabel="TalentTrace logo"
        />
        </View>
    );
}

export default function LandingScreen() {
    const router = useRouter();
    const [signingIn, setSigningIn] = useState(false);

    // §7.3 — Landing screen animation values
    const heroOpacity = useRef(new Animated.Value(0)).current;
    const heroScale   = useRef(new Animated.Value(0.9)).current;  // scale 0.9 → 1.0
    const orb1Y       = useRef(new Animated.Value(0)).current;
    const orb2Y       = useRef(new Animated.Value(0)).current;
    const headlineOp  = useRef(new Animated.Value(0)).current;
    const headlineY   = useRef(new Animated.Value(30)).current;   // slide up 30px
    const ctaOp       = useRef(new Animated.Value(0)).current;
    const ctaY        = useRef(new Animated.Value(20)).current;   // slide up 20px

    useEffect(() => {
        // §7.3 — Floating elements: ±8px translateY over 3s, staggered 400ms (infinite)
        const floatAnimation = (anim, initDelay) => Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: -8, duration: 3000, delay: initDelay,
                    easing: Easing.inOut(Easing.ease), useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 8, duration: 3000,
                    easing: Easing.inOut(Easing.ease), useNativeDriver: true,
                }),
            ])
        );
        floatAnimation(orb1Y, 0).start();
        floatAnimation(orb2Y, 400).start();  // 400ms stagger per §7.3

        // §7.3 — Entrance sequence
        Animated.sequence([
            Animated.delay(200),                                 // start 200ms after mount
            // Hero: fade in + scale 0.9→1.0 over 600ms (§7.3)
            Animated.parallel([
                Animated.timing(heroOpacity, {
                    toValue: 1, duration: 600,
                    easing: Easing.bezier(0.16, 1, 0.3, 1),    // --motion-slow easing
                    useNativeDriver: true,
                }),
                Animated.spring(heroScale, {
                    toValue: 1, friction: 8, tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            // §7.3 — Headline: slide up 30px + fade, 500ms staggered by word
            Animated.parallel([
                Animated.timing(headlineOp, {
                    toValue: 1, duration: 500,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(headlineY, {
                    toValue: 0, duration: 500,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
            // §7.3 — CTA: slide up 20px + fade, 400ms, after headline
            Animated.parallel([
                Animated.timing(ctaOp, {
                    toValue: 1, duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(ctaY, {
                    toValue: 0, duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const handleGoogleSignIn = async () => {
        setSigningIn(true);
        try {
            const result = await signInWithGoogle();
            showToast('success', 'Signed In!', `Welcome, ${result.userName || result.userEmail}`);
            let hasRole = false;
            if (auth.currentUser) {
                const profile = await getUserProfile(auth.currentUser.uid);
                if (profile?.role) hasRole = true;
            }
            router.replace(hasRole ? '/' : '/role-select');
        } catch (err) {
            if (err.code !== 'ASYNC_OP_IN_PROGRESS' && err.code !== 'SIGN_IN_CANCELLED') {
                showToast('error', 'Sign-In Failed', err.message || 'Could not sign in with Google.');
            }
        } finally {
            setSigningIn(false);
        }
    };

    return (
        // Fix: backgroundColor prevents white bleed-through if layout overflows
        <View style={styles.container}>
            {/* §2.2 — gradient-hero: deep green → near-black → forest green */}
            <LinearGradient
                colors={[C.bgDark, C.primaryDark, C.primaryMid]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* §12.3 — Decorative background orbs (blurred translucent shapes) */}
            <Animated.View
                style={[styles.bgOrb1, { transform: [{ translateY: orb1Y }] }]}
            />
            <Animated.View
                style={[styles.bgOrb2, { transform: [{ translateY: orb2Y }] }]}
            />

            {/* Status bar: light content on dark background */}
            <StatusBar style="light" />

            {/* §8.1 — Hero area: top ~55%, large immersive illustration */}
            <Animated.View
                style={[
                    styles.heroArea,
                    {
                        opacity: heroOpacity,
                        transform: [{ scale: heroScale }],
                    },
                ]}
            >
                <NetworkHero />
                {/* §8.1 — App name below hero mark */}
                <Text style={styles.heroAppName}>TalentTrace</Text>
            </Animated.View>

            {/* §8.1 — Bottom content: bottom ~45% */}
            <View style={styles.bottomArea}>

                {/* §8.1 — Headline: two lines, key word in italic lime accent (§3.3 single exception) */}
                <Animated.View
                    style={{
                        opacity: headlineOp,
                        transform: [{ translateY: headlineY }],
                        marginBottom: 32,  // §5.2 — 32px gap before CTA
                    }}
                >
                    <Text style={styles.headline}>
                        Find HR contacts.{'\n'}
                        Land your next job{' '}
                        <Text style={styles.headlineAccentItalic}>faster.</Text>
                    </Text>
                    <Text style={styles.tagline}>
                        AI-powered cold outreach for job seekers and sales teams
                    </Text>
                </Animated.View>

                {/* §8.1 — Primary CTA + secondary link */}
                <Animated.View
                    style={{
                        opacity: ctaOp,
                        transform: [{ translateY: ctaY }],
                        gap: 16,  // §5.2 — 16px between CTA and secondary link
                    }}
                >
                    {/* §6.1 — Primary CTA button (white pill on dark bg) */}
                    <TouchableOpacity
                        style={[styles.ctaBtn, signingIn && styles.ctaBtnDisabled]}
                        onPress={handleGoogleSignIn}
                        disabled={signingIn}
                        activeOpacity={0.85}
                        accessibilityLabel="Sign in with Google to continue"
                        accessibilityRole="button"
                    >
                        {signingIn ? (
                            <ActivityIndicator size="small" color={C.primaryDark} />
                        ) : (
                            <>
                                {/* Google G icon */}
                                <View style={styles.googleBadge}>
                                    <Text style={styles.googleBadgeText}>G</Text>
                                </View>
                                <Text style={styles.ctaBtnText}>Sign in with Google</Text>
                                {/* §4.3 — ArrowRight icon, Lucide, 18px (inline text icon) */}
                                <View style={styles.ctaArrow}>
                                    <ArrowRight size={18} color={C.primaryDark} strokeWidth={2} />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* §8.1 — Privacy notice */}
                    <Text style={styles.notice}>
                        We only request permission to send emails.{'\n'}
                        We cannot read or access your inbox.
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D2E10',  // dark bg prevents white flicker/scroll bleed
        overflow: 'hidden',
    },

    // §12.3 — Abstract decorative orbs (translucent, low opacity)
    bgOrb1: {
        position: 'absolute',
        width: 340, height: 340, borderRadius: 170,
        backgroundColor: 'rgba(26, 92, 31, 0.25)',
        top: -80, right: -100,
    },
    bgOrb2: {
        position: 'absolute',
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgba(176, 236, 112, 0.05)',
        bottom: '38%', left: -80,
    },

    // §8.1 — Top 55% hero area
    heroArea: {
        flex: 0.55,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: Platform.OS === 'android' ? 48 : 24,
        gap: 8,
    },
    heroAppName: {
        // §3.2 — type-h3: 20px 600
        fontSize: 20,
        fontWeight: '600',
        color: C.white50,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // §8.1 — Bottom 45%
    bottomArea: {
        flex: 0.45,
        paddingHorizontal: 20,   // §5.2 — 20px screen padding
        paddingBottom: Platform.OS === 'ios' ? 44 : 32,
        justifyContent: 'flex-end',
    },

    // §3.2 — type-display: 40px 700, -0.02em letter-spacing
    headline: {
        fontSize: 36,
        fontWeight: '700',
        color: C.white,
        lineHeight: 44,
        letterSpacing: -0.72,
        marginBottom: 12,
    },
    headlineAccentItalic: {
        // §2.1 accent + §3.3 italic exception for landing tagline word
        color: C.accent,
        fontStyle: 'italic',
    },
    tagline: {
        // §3.2 — type-label: 14px 500
        fontSize: 14,
        fontWeight: '500',
        color: C.white70,
        lineHeight: 21,
    },

    // §6.1 — Primary CTA (white pill, dark text for visibility on dark bg)
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.white,
        borderRadius: 9999,      // §5.2 — pill radius
        height: 56,              // §6.1 — 48px + slight increase for visual weight
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
        gap: 12,
    },
    ctaBtnDisabled: { opacity: 0.6 },
    googleBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#4285F4',
        alignItems: 'center', justifyContent: 'center',
    },
    googleBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    ctaBtnText: {
        flex: 1,
        // §3.2 — type-body-medium: 16px 500
        fontSize: 16,
        fontWeight: '600',
        color: C.primaryDark,
    },
    // §4.3 — Icon container: 48x48px rounded, surface-light bg
    ctaArrow: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(20,69,22,0.08)',
        alignItems: 'center', justifyContent: 'center',
    },

    // §3.2 — type-caption: 12px
    notice: {
        fontSize: 12,
        color: C.white50,
        textAlign: 'center',
        lineHeight: 18,
    },
});
