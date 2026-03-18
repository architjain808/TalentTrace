import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/config';

const CONTACTS_TTL_DAYS = 30;
const DOMAIN_TTL_DAYS   = 365;

/**
 * Convert a targetRole string to a safe Firestore field key.
 * "HR Manager" → "hr_manager", "CTO" → "cto"
 */
function normalizeRoleKey(role) {
  return (role || 'unknown')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40);
}

/**
 * Check the domain cache for a specific role.
 *
 * Returns one of three tiers:
 *   { tier: 'exact',  exactContacts: [...], crossRoleContacts: []    }  — same role, fresh
 *   { tier: 'cross',  exactContacts: [],    crossRoleContacts: [...] }  — other roles, fresh
 *   { tier: 'miss',   exactContacts: [],    crossRoleContacts: []    }  — nothing usable
 *
 * Legacy documents (old flat verifiedContacts format) are deleted on detection.
 */
export async function checkCache(domain, targetRole) {
  if (!domain) return { tier: 'miss', exactContacts: [], crossRoleContacts: [] };

  const MISS = { tier: 'miss', exactContacts: [], crossRoleContacts: [] };

  try {
    const docRef = doc(db, 'domainCache', domain);
    const snap   = await getDoc(docRef);
    if (!snap.exists()) return MISS;

    const data = snap.data();
    const now  = Date.now();

    // ── Legacy format guard ──────────────────────────────────────────────────
    // Old structure used a flat `verifiedContacts` array (not role-partitioned).
    // These results are meaningless for role-aware lookup — delete and start fresh.
    if (!data.contactsByRole && data.verifiedContacts !== undefined) {
      deleteDoc(docRef).catch(() => {}); // non-blocking cleanup
      return MISS;
    }

    // ── Domain TTL ───────────────────────────────────────────────────────────
    const docAgeDays = (now - (data.lastUpdatedAt?.toMillis?.() || 0)) / 86400000;
    if (docAgeDays > DOMAIN_TTL_DAYS) return MISS;

    const contactsByRole = data.contactsByRole || {};
    const roleKey = normalizeRoleKey(targetRole);

    // ── Tier 1: exact role match ─────────────────────────────────────────────
    const exactEntry = contactsByRole[roleKey];
    if (exactEntry?.savedAt && exactEntry.contacts?.length > 0) {
      const ageDays = (now - new Date(exactEntry.savedAt).getTime()) / 86400000;
      if (ageDays <= CONTACTS_TTL_DAYS) {
        return { tier: 'exact', exactContacts: exactEntry.contacts, crossRoleContacts: [] };
      }
    }

    // ── Tier 2: cross-role contacts from other role searches ─────────────────
    const crossRoleContacts = [];
    for (const [key, entry] of Object.entries(contactsByRole)) {
      if (key === roleKey || !entry?.savedAt || !entry.contacts?.length) continue;
      const ageDays = (now - new Date(entry.savedAt).getTime()) / 86400000;
      if (ageDays <= CONTACTS_TTL_DAYS) {
        crossRoleContacts.push(...entry.contacts);
      }
    }

    if (crossRoleContacts.length > 0) {
      return { tier: 'cross', exactContacts: [], crossRoleContacts };
    }

    return MISS;
  } catch (e) {
    console.warn('Cache read failed:', e.message);
    return { tier: 'miss', exactContacts: [], crossRoleContacts: [] };
  }
}

/**
 * One-time migration: delete all legacy domainCache documents that use the old
 * flat `verifiedContacts` structure (pre role-partitioning).
 * Should be called once at app startup, guarded by an AsyncStorage flag in the caller.
 */
export async function migrateLegacyCache() {
  try {
    const cacheRef    = collection(db, 'domainCache');
    const legacyQuery = query(cacheRef, where('verifiedContacts', '!=', null));
    const snap        = await getDocs(legacyQuery);

    if (snap.empty) return;

    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    console.log(`[CacheMigration] Deleted ${snap.docs.length} legacy domainCache document(s)`);
  } catch (e) {
    console.warn('[CacheMigration] Failed:', e.message);
  }
}

/**
 * Save search results to cache under the specific targetRole key.
 * Uses dot-notation updateDoc so OTHER role entries in contactsByRole are preserved.
 * Falls back to setDoc (create) if the document does not yet exist.
 *
 * Only writes when there are contacts to save — never writes empty results.
 * Fire-and-forget — do NOT await in the main search flow.
 */
export async function updateCache(domain, company, contacts, targetRole) {
  if (!domain || !targetRole) return;
  // Never write to cache when there are no contacts — it would waste a Firestore
  // write and update lastUpdatedAt for a fruitless search.
  if (!contacts || contacts.length === 0) return;
  const roleKey = normalizeRoleKey(targetRole);

  try {
    const docRef = doc(db, 'domainCache', domain);

    const roleEntry = contacts?.length > 0 ? {
      contacts: contacts.map(c => ({
        name:     c.name,
        email:    c.email,
        role:     c.role,
        linkedin: c.linkedin || null,
        verified: c.verified || false,
      })),
      savedAt: new Date().toISOString(),
    } : null;

    // Build payload — dot-notation key preserves sibling role entries
    const updatePayload = {
      domain,
      company,
      lastUpdatedAt: serverTimestamp(),
      searchCount:   increment(1),
    };
    if (roleEntry) {
      updatePayload[`contactsByRole.${roleKey}`] = roleEntry;
    }

    try {
      // updateDoc only works if document already exists
      await updateDoc(docRef, updatePayload);
    } catch (err) {
      if (err.code === 'not-found') {
        // First time this domain is cached — create the document
        const createPayload = {
          domain,
          company,
          lastUpdatedAt: serverTimestamp(),
          searchCount:   1,
          contactsByRole: roleEntry ? { [roleKey]: roleEntry } : {},
        };
        await setDoc(docRef, createPayload);
      } else {
        throw err;
      }
    }
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
}
