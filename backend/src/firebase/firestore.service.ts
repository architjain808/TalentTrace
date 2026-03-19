import { Injectable, Logger, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const USERS_COLLECTION = 'users';
const RECEIPTS_COLLECTION = 'paymentReceipts';

@Injectable()
export class FirestoreService {
  private readonly db: admin.firestore.Firestore;
  private readonly logger = new Logger(FirestoreService.name);

  constructor(@Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App) {
    this.db = this.firebaseApp.firestore();
  }

  /**
   * Atomically add `amount` credits to a user's quotaBalance.
   * Uses Firestore FieldValue.increment — safe under concurrent writes.
   */
  async creditQuota(uid: string, amount: number): Promise<void> {
    if (!uid) throw new Error('uid is required');
    if (typeof amount !== 'number' || amount <= 0)
      throw new Error('amount must be a positive number');

    const ref = this.db.collection(USERS_COLLECTION).doc(uid);
    await ref.update({
      quotaBalance: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    });

    this.logger.log(`Credited ${amount} quota to user ${uid}`);
  }

  /**
   * Fetch user document. Returns null if not found.
   */
  async getUser(uid: string): Promise<admin.firestore.DocumentData | null> {
    const snap = await this.db.collection(USERS_COLLECTION).doc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  /**
   * Store an immutable payment receipt after a successful purchase.
   * Document ID = purchaseToken (unique per purchase).
   */
  async storeReceipt(purchaseToken: string, data: Record<string, any>): Promise<void> {
    await this.db
      .collection(RECEIPTS_COLLECTION)
      .doc(purchaseToken)
      .set({
        ...data,
        processedAt: FieldValue.serverTimestamp(),
      });
    this.logger.log(`Receipt stored: ${purchaseToken}`);
  }

  /**
   * Idempotency check — returns true if this purchaseToken has already been processed.
   */
  async receiptExists(purchaseToken: string): Promise<boolean> {
    const snap = await this.db
      .collection(RECEIPTS_COLLECTION)
      .doc(purchaseToken)
      .get();
    return snap.exists;
  }
}
