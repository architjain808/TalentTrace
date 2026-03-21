/**
 * iapService.web.js
 *
 * Web fallback for Google Play Billing integration.
 * 'react-native-iap' contains native Java/Objective-C code and cannot be imported
 * or bundled by Metro when compiling for the Web. 
 *
 * Exposes the exact same API as iapService.js but performs web-safe mock actions
 * or throws clear "Not supported" messages when attempting native actions.
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

export const PRODUCT_SKUS = [
  'test_pack',
  'quota_starter_50',
  'quota_pro_150',
  'quota_growth_500',
];

// ─── Backend Calls (Safe for Web) ─────────────────────────────────────────────

export async function getProducts() {
  const res = await fetch(`${BACKEND_URL}/iap/products`);
  if (!res.ok) throw new Error('Failed to fetch products from backend');
  return res.json();
}

export async function verifyPurchaseWithBackend(idToken, { purchaseToken, productId }) {
  const res = await fetch(`${BACKEND_URL}/iap/verify-purchase`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ purchaseToken, productId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Purchase verification failed');
  }

  return data;
}

// ─── Google Play Billing (Mocks for Web) ──────────────────────────────────────

export async function initIAP() {
  console.warn('[IAP Web] Google Play Billing is not supported on the web. Using fallback UI.');
  // Return an empty array so the UI just falls back to default QUOTA_PACKS static pricing
  return [];
}

export async function endIAP() {
  // No-op for web
}

export async function purchaseProduct(productId) {
  throw new Error('In-App Purchases are only available on the Android app.');
}

export async function buyQuotaPack(productId, idToken) {
  // Gracefully degrade the button tap action
  alert('In-App Purchases are not supported on the web version. Please use the Android app to buy credits.');
  throw new Error('IAP_NOT_SUPPORTED_ON_WEB');
}
