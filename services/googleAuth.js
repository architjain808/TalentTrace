import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { saveSecureKey, getSecureKey, deleteSecureKey } from './storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Complete any pending auth sessions
WebBrowser.maybeCompleteAuthSession();

// Client IDs from .env (loaded via expo-constants)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || Constants.expoConfig?.extra?.googleWebClientId || '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || Constants.expoConfig?.extra?.googleAndroidClientId || '';
const WEB_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET || '';

// Secure storage keys
const KEYS = {
    ACCESS_TOKEN: 'google_access_token',
    REFRESH_TOKEN: 'google_refresh_token',
    TOKEN_EXPIRY: 'google_token_expiry',
    USER_EMAIL: 'google_user_email',
    USER_NAME: 'google_user_name',
};

// Scopes we need
const SCOPES = [
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.send',
];

/**
 * React hook for Google Sign-In using expo-auth-session PKCE flow
 * Usage: const { request, signIn, signOut, authState, isLoading } = useGoogleAuth();
 */
export function useGoogleAuth() {
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: WEB_CLIENT_ID,
        androidClientId: ANDROID_CLIENT_ID,
        scopes: SCOPES,
        responseType: 'code',
        shouldAutoExchangeCode: false,
        extraParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
    });

    return { request, response, promptAsync };
}

/**
 * Exchange authorization code for access + refresh tokens
 * Called after the user completes Google sign-in
 * @param {string} code - Authorization code from Google
 * @param {string} codeVerifier - PKCE code verifier from the auth request
 */
export async function exchangeCodeForTokens(code, codeVerifier) {
    const clientId = Platform.OS === 'android' ? ANDROID_CLIENT_ID : WEB_CLIENT_ID;

    const redirectUri = makeRedirectUri({
        scheme: Constants.expoConfig?.scheme,
        path: '',
    });

    const params = {
        code,
        client_id: clientId,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    };

    // PKCE: use code_verifier instead of client_secret (for Android/native)
    if (codeVerifier) {
        params.code_verifier = codeVerifier;
    }

    // Web Client IDs require client_secret (Android uses PKCE/SHA-1 instead)
    if (Platform.OS === 'web' && WEB_CLIENT_SECRET) {
        params.client_secret = WEB_CLIENT_SECRET;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
    });

    const data = await tokenRes.json();

    if (data.error) {
        throw new Error(data.error_description || data.error);
    }

    // Store tokens securely
    await saveSecureKey(KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
        await saveSecureKey(KEYS.REFRESH_TOKEN, data.refresh_token);
    }

    const expiresAt = Date.now() + (data.expires_in * 1000);
    await saveSecureKey(KEYS.TOKEN_EXPIRY, expiresAt.toString());

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userRes.json();

    await saveSecureKey(KEYS.USER_EMAIL, user.email || '');
    await saveSecureKey(KEYS.USER_NAME, user.name || '');

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        userEmail: user.email,
        userName: user.name,
    };
}

/**
 * Get a valid access token — auto-refreshes if expired
 */
export async function getAccessToken() {
    const accessToken = await getSecureKey(KEYS.ACCESS_TOKEN);
    const expiryStr = await getSecureKey(KEYS.TOKEN_EXPIRY);
    const refreshToken = await getSecureKey(KEYS.REFRESH_TOKEN);

    if (!accessToken || !refreshToken) {
        throw new Error('Not signed in with Google. Please sign in first.');
    }

    // Check if token is still valid (with 5 min buffer)
    const expiry = parseInt(expiryStr || '0');
    if (Date.now() < expiry - 300000) {
        return accessToken;
    }

    // Token expired — refresh it
    const clientId = Platform.OS === 'android' ? ANDROID_CLIENT_ID : WEB_CLIENT_ID;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            grant_type: 'refresh_token',
        }).toString(),
    });

    const data = await tokenRes.json();

    if (data.error) {
        // Refresh failed — user needs to re-sign-in
        await signOut();
        throw new Error('Google session expired. Please sign in again.');
    }

    await saveSecureKey(KEYS.ACCESS_TOKEN, data.access_token);
    const newExpiry = Date.now() + (data.expires_in * 1000);
    await saveSecureKey(KEYS.TOKEN_EXPIRY, newExpiry.toString());

    return data.access_token;
}

/**
 * Get current auth state
 */
export async function getAuthState() {
    const email = await getSecureKey(KEYS.USER_EMAIL);
    const name = await getSecureKey(KEYS.USER_NAME);
    const token = await getSecureKey(KEYS.ACCESS_TOKEN);

    return {
        isSignedIn: !!(email && token),
        userEmail: email || null,
        userName: name || null,
    };
}

/**
 * Sign out — clear all stored tokens
 */
export async function signOut() {
    for (const key of Object.values(KEYS)) {
        await deleteSecureKey(key);
    }
}
