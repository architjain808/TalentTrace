import { collection, doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Collection reference for users
 */
const USERS_COLLECTION = 'users';

/**
 * Creates or updates a user document in Firestore after sign-in.
 * 
 * @param {string} uid - Firebase Auth user ID
 * @param {object} userData - User details (email, name, photoURL)
 */
export async function saveUserToFirestore(uid, userData) {
    if (!uid) throw new Error("User ID is required");

    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create a new user record with default quota
            await setDoc(userRef, {
                email: userData.email || '',
                name: userData.name || '',
                photoURL: userData.photoURL || '',
                quotaBalance: 50,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
            });
            console.log(`[UserCRUD] Created new user: ${uid}`);
        } else {
            // Update last login
            await updateDoc(userRef, {
                lastLoginAt: serverTimestamp(),
                // Update photo/name if they changed
                name: userData.name || userSnap.data().name,
                photoURL: userData.photoURL || userSnap.data().photoURL
            });
            console.log(`[UserCRUD] Updated existing user: ${uid}`);
        }
    } catch (error) {
        console.error("[UserCRUD] Error saving user to Firestore:", error);
        throw error;
    }
}

/**
 * Retrieves user details from Firestore.
 * 
 * @param {string} uid - Firebase Auth user ID
 * @returns {object|null} - User data or null if not found
 */
export async function getUserProfile(uid) {
    if (!uid) return null;

    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("[UserCRUD] Error getting user profile:", error);
        throw error;
    }
}

/**
 * Adds or updates the quotaBalance of a user.
 * 
 * @param {string} uid - Firebase Auth user ID
 * @param {number} amount - Amount to add to the quota (can be negative to deduct)
 */
export async function updateQuotaBalance(uid, amount) {
    if (!uid) throw new Error("User ID is required");
    if (typeof amount !== 'number') throw new Error("Amount must be a number");

    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            quotaBalance: increment(amount),
            updatedAt: serverTimestamp()
        });
        console.log(`[UserCRUD] Quota balance updated by ${amount} for user ${uid}`);
    } catch (error) {
        console.error("[UserCRUD] Error updating quota balance:", error);
        throw error;
    }
}

/**
 * Directly sets the quota balance to a specific value.
 * 
 * @param {string} uid - Firebase Auth user ID
 * @param {number} newBalance - New quota balance
 */
export async function setQuotaBalance(uid, newBalance) {
    if (!uid) throw new Error("User ID is required");
    if (typeof newBalance !== 'number') throw new Error("Balance must be a number");

    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            quotaBalance: newBalance,
            updatedAt: serverTimestamp()
        });
        console.log(`[UserCRUD] Quota balance set to ${newBalance} for user ${uid}`);
    } catch (error) {
        console.error("[UserCRUD] Error setting quota balance:", error);
        throw error;
    }
}

/**
 * Updates the user's role in Firestore.
 * 
 * @param {string} uid - Firebase Auth user ID
 * @param {string} roleId - The role ID to set
 */
export async function saveUserRoleToFirestore(uid, roleId) {
    if (!uid) throw new Error("User ID is required");
    if (!roleId) throw new Error("Role ID is required");

    try {
        const userRef = doc(db, USERS_COLLECTION, uid);
        await updateDoc(userRef, {
            role: roleId,
            updatedAt: serverTimestamp()
        });
        console.log(`[UserCRUD] Role updated to ${roleId} for user ${uid}`);
    } catch (error) {
        console.error("[UserCRUD] Error saving user role:", error);
        throw error;
    }
}
