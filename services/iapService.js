/**
 * iapService.js
 *
 * Frontend service for Google Play Billing integration.
 *
 * Flow:
 *   1. Call getProducts() — fetch quota pack info from backend (for display)
 *   2. Call purchaseProduct(productId) — trigger Google Play Billing UI via react-native-iap
 *   3. On successful purchase, call verifyPurchase(idToken, { purchaseToken, productId })
 *      to have the backend verify with Google Play API and credit quota in Firestore.
 *
 * Note: react-native-iap requires expo prebuild (bare workflow).
 * The app already has expo prebuild configured — run `npm run prebuild` after
 * adding react-native-iap to install native modules.
 */

import * as RNIap from 'react-native-iap';
import { getAuthState } from './googleAuth';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.0.2.2:3001';

// Match these to the Product IDs created in Google Play Console
export const PRODUCT_SKUS = [
  'quota_starter_50',
  'quota_pro_150',
  'quota_growth_500',
];

// ─── Backend Calls ────────────────────────────────────────────────────────────

/**
 * Fetch quota pack catalogue from the backend.
 * Used to display product names, descriptions, and credit amounts.
 * (Actual prices are fetched from Play Store via react-native-iap)
 */
export async function getProducts() {
  const res = await fetch(`${BACKEND_URL}/iap/products`);
  if (!res.ok) throw new Error('Failed to fetch products from backend');
  return res.json(); // { products: [...] }
}

/**
 * After a successful Google Play purchase, send the purchaseToken
 * to our backend for server-side verification and quota crediting.
 *
 * @param {string} idToken - Firebase ID token for the current user
 * @param {{ purchaseToken: string, productId: string }} payload
 */
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

  return data; // { success: true, creditsAdded: number, message: string }
}

// ─── Google Play Billing ──────────────────────────────────────────────────────

/**
 * Initialize react-native-iap and fetch product details from Google Play.
 * Call this once when the plan picker screen mounts.
 */
export async function initIAP() {
  await RNIap.initConnection();
  const products = await RNIap.getProducts({ skus: PRODUCT_SKUS });
  return products; // includes localizedPrice from Play Store
}

/**
 * Terminate the IAP connection. Call this on unmount.
 */
export async function endIAP() {
  await RNIap.endConnection();
}

/**
 * Trigger a Google Play purchase for the given SKU.
 * Shows the Google Play Billing bottom sheet.
 *
 * Returns the purchase object: { purchaseToken, productId, ... }
 */
export async function purchaseProduct(productId) {
  const purchase = await RNIap.requestPurchase({ skus: [productId] });
  return purchase;
}

/**
 * Full purchase + verify flow.
 *
 * Usage:
 *   const { creditsAdded } = await buyQuotaPack('quota_starter_50', idToken);
 *
 * @param {string} productId
 * @param {string} idToken - Firebase ID token
 * @returns {{ creditsAdded: number, message: string }}
 */
export async function buyQuotaPack(productId, idToken) {
  // 1. Trigger Play Billing purchase UI
  const purchase = await purchaseProduct(productId);
  const purchaseToken = purchase?.purchaseToken;

  if (!purchaseToken) {
    throw new Error('No purchase token received from Google Play');
  }

  // 2. Verify with backend + credit Firestore quota
  const result = await verifyPurchaseWithBackend(idToken, {
    purchaseToken,
    productId,
  });

  // 3. Finish / consume the transaction on the client side
  // For non-consumable one-time products, finishTransaction is enough
  await RNIap.finishTransaction({ purchase, isConsumable: false });

  return result;
}
