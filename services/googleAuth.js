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
if (Platform.OS !== 'web') {
    GoogleSignin.configure({
        scopes: SCOPES,
        webClientId: WEB_CLIENT_ID,
        offlineAccess: true, // Required to get a refresh token in the background
        forceCodeForRefreshToken: true,
    });
}

/**
 * Perform Google Sign-In using the native SDK
 */
export async function signInWithGoogle() {
    if (Platform.OS === 'web') {
        return new Promise((resolve, reject) => {
            const handleAuth = () => {
                try {
                    const client = window.google.accounts.oauth2.initTokenClient({
                        client_id: WEB_CLIENT_ID,
                        scope: SCOPES.join(' '),
                        callback: async (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                try {
                                    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                                    });
                                    if (!userInfoRes.ok) throw new Error('Failed to fetch user info');

                                    const userInfo = await userInfoRes.json();

                                    await saveSecureKey(KEYS.ACCESS_TOKEN, tokenResponse.access_token);
                                    await saveSecureKey(KEYS.USER_EMAIL, userInfo.email || '');
                                    await saveSecureKey(KEYS.USER_NAME, userInfo.name || '');

                                    resolve({
                                        accessToken: tokenResponse.access_token,
                                        userEmail: userInfo.email,
                                        userName: userInfo.name,
                                        userInfo: userInfo
                                    });
                                } catch (err) {
                                    reject(err);
                                }
                            } else {
                                reject(new Error('No token returned'));
                            }
                        },
                        error_callback: (err) => {
                            reject(err);
                        }
                    });
                    client.requestAccessToken();
                } catch (err) {
                    reject(err);
                }
            };

            if (window.google && window.google.accounts) {
                handleAuth();
            } else {
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.async = true;
                script.defer = true;
                script.onload = handleAuth;
                script.onerror = () => reject(new Error('Failed to load Google Identity Script'));
                document.body.appendChild(script);
            }
        });
    }
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
    if (Platform.OS === 'web') {
        const token = await getSecureKey(KEYS.ACCESS_TOKEN);
        if (token) return token;
        throw new Error('Google session expired on web. Please sign in again.');
    }
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
    if (Platform.OS === 'web') {
        const email = await getSecureKey(KEYS.USER_EMAIL);
        const name = await getSecureKey(KEYS.USER_NAME);
        const token = await getSecureKey(KEYS.ACCESS_TOKEN);

        if (email && token) {
            return {
                isSignedIn: true,
                userEmail: email,
                userName: name,
            };
        }
        return { isSignedIn: false, userEmail: null, userName: null };
    }
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
    if (Platform.OS !== 'web') {
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.warn('[GoogleAuth] Native SignOut Error:', error);
        }
    } else {
        // Optional: Revoke token on web if needed, 
        // e.g., window.google?.accounts?.oauth2?.revoke(...)
        console.log('[GoogleAuth] Web SignOut executed locally');
    }

    for (const key of Object.values(KEYS)) {
        await deleteSecureKey(key);
    }
}
