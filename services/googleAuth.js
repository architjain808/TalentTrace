import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { saveSecureKey, getSecureKey, deleteSecureKey } from './storage';

// Client IDs from .env (bundled at build time via EXPO_PUBLIC_*)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
/*
 * We DO NOT need to configure the androidClientId in GoogleSignin.configure().
 * The Android SDK automatically infers its own client ID from the google-services.json / SHA-1.
 * We ONLY need to pass the WEB_CLIENT_ID to get a serverAuthCode or idToken.
 */

console.log('[GoogleAuth] WEB_CLIENT_ID:', WEB_CLIENT_ID ? WEB_CLIENT_ID.slice(0, 25) + '...' : 'EMPTY');

// Secure storage keys
const KEYS = {
    ACCESS_TOKEN: 'google_access_token',
    USER_EMAIL: 'google_user_email',
    USER_NAME: 'google_user_name',
};

// Scopes we need
const SCOPES = [
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.send',
];

// ─── INITIALIZE GOOGLE SIGN-IN ──────────────────────────────────────────────
GoogleSignin.configure({
    scopes: SCOPES,
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true, // Required to get a refresh token in the background
    forceCodeForRefreshToken: true,
});

/**
 * Perform Google Sign-In using the native SDK
 */
export async function signInWithGoogle() {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();

        // In @react-native-google-signin/google-signin v11+, userInfo is wrapped in a `data` object
        const user = userInfo.data ? userInfo.data.user : userInfo.user;

        // After native sign-in, the SDK holds the tokens.
        // We retrieve the active access token.
        const tokens = await GoogleSignin.getTokens();

        console.log('[GoogleAuth] Native Sign-In Success:', user.email);

        await saveSecureKey(KEYS.ACCESS_TOKEN, tokens.accessToken);
        await saveSecureKey(KEYS.USER_EMAIL, user.email || '');
        await saveSecureKey(KEYS.USER_NAME, user.name || '');

        return {
            accessToken: tokens.accessToken,
            userEmail: user.email,
            userName: user.name,
            userInfo,
        };
    } catch (error) {
        console.error('[GoogleAuth] Sign In Error:', error);
        throw error;
    }
}

/**
 * Get a valid access token.
 * The GoogleSignin SDK handles token caching and refreshing automatically
 * when you call getTokens().
 */
export async function getAccessToken() {
    try {
        // SDK throws if not signed in, or if it can't silently refresh
        const tokens = await GoogleSignin.getTokens();

        // Update stored token
        await saveSecureKey(KEYS.ACCESS_TOKEN, tokens.accessToken);
        return tokens.accessToken;
    } catch (error) {
        // Silent refresh failed or not signed in
        await signOut();
        throw new Error('Google session expired. Please sign in again.');
    }
}

/**
 * Get current auth state
 */
export async function getAuthState() {
    // Check if SDK has an active session (v11+ uses hasPreviousSignIn instead of isSignedIn)
    const isSignedIn = GoogleSignin.hasPreviousSignIn();

    if (!isSignedIn) {
        return { isSignedIn: false, userEmail: null, userName: null };
    }

    const email = await getSecureKey(KEYS.USER_EMAIL);
    const name = await getSecureKey(KEYS.USER_NAME);

    return {
        isSignedIn: true,
        userEmail: email || null,
        userName: name || null,
    };
}

/**
 * Returns whether Google OAuth is configured
 */
export function isGoogleAuthConfigured() {
    return !!WEB_CLIENT_ID;
}

/**
 * Sign out — clear native SDK session and stored tokens
 */
export async function signOut() {
    try {
        await GoogleSignin.signOut();
    } catch (error) {
        console.warn('[GoogleAuth] Native SignOut Error:', error);
    }

    for (const key of Object.values(KEYS)) {
        await deleteSecureKey(key);
    }
}
