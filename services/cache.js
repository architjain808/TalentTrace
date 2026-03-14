import { doc, getDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Check cache for a domain. Returns cached data or null.
 */
export async function checkCache(domain) {
  if (!domain) return null;
  try {
    const docRef = doc(db, 'domainCache', domain);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const ageDays = (Date.now() - (data.lastUpdatedAt?.toMillis?.() || 0)) / 86400000;

    if (ageDays > 365) return null; // Expired

    return {
      domain: data.domain,
      // Contacts expire at 30 days
      contacts: ageDays <= 30 ? (data.verifiedContacts || []) : [],
      hasFreshContacts: ageDays <= 30 && (data.verifiedContacts?.length > 0),
    };
  } catch (e) {
    console.warn('Cache read failed:', e.message);
    return null;
  }
}

/**
 * Save search results to cache. Fire-and-forget (don't await in main flow).
 */
export async function updateCache(domain, company, contacts) {
  if (!domain) return;
  try {
    const docRef = doc(db, 'domainCache', domain);
    const data = {
      domain,
      company,
      lastUpdatedAt: serverTimestamp(),
      searchCount: increment(1),
    };

    if (contacts?.length > 0) {
      data.verifiedContacts = contacts.map(c => ({
        name: c.name,
        email: c.email,
        role: c.role,
        linkedin: c.linkedin || null,
        verified: c.verified || false,
        savedAt: new Date().toISOString(),
      }));
    }

    await setDoc(docRef, data, { merge: true });
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
}
