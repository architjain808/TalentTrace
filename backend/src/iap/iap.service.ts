import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { FirestoreService } from '../firebase/firestore.service';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';

// ─── Product Catalogue ────────────────────────────────────────────────────────
// Defines available quota packs. Prices shown are informational only —
// actual prices are set and enforced by Google Play Console.
export const PRODUCTS = [
  {
    id: 'test_pack',
    name: 'Test Pack',
    credits: 10,
    description: '10 contact searches',
    price: '₹1',
    popular: false,
  },
  {
    id: 'quota_starter_50',
    name: 'Starter Pack',
    credits: 50,
    description: '50 contact searches',
    price: '₹99',
    popular: false,
  },
  {
    id: 'quota_pro_150',
    name: 'Pro Pack',
    credits: 150,
    description: '150 contact searches',
    price: '₹249',
    popular: true,
  },
  {
    id: 'quota_growth_500',
    name: 'Growth Pack',
    credits: 500,
    description: '500 contact searches',
    price: '₹699',
    popular: false,
  },
] as const;

// Map for fast credit lookup
const PRODUCT_CREDITS: Record<string, number> = {};
PRODUCTS.forEach((p) => (PRODUCT_CREDITS[p.id] = p.credits));

// ─── Service ─────────────────────────────────────────────────────────────────
@Injectable()
export class IapService {
  private readonly logger = new Logger(IapService.name);
  private readonly packageName: string;
  private readonly androidPublisher;

  constructor(
    private readonly config: ConfigService,
    private readonly firestoreService: FirestoreService,
  ) {
    this.packageName = this.config.getOrThrow<string>('GOOGLE_PLAY_PACKAGE_NAME');

    const serviceAccountPath = this.config.get<string>(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_PATH',
      './play-service-account.json',
    );

    // Initialize Google Play Developer API client with service account
    const auth = new google.auth.GoogleAuth({
      keyFile: require('path').resolve(process.cwd(), serviceAccountPath),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    this.androidPublisher = google.androidpublisher({ version: 'v3', auth });
  }

  // ─── Get Products ──────────────────────────────────────────────────────────
  getProducts() {
    return { products: PRODUCTS };
  }

  // ─── Verify & Credit ──────────────────────────────────────────────────────
  /**
   * 1. Validate productId is known
   * 2. Check idempotency (receipt already processed?)
   * 3. Call Google Play Developer API to verify the purchaseToken
   * 4. Confirm purchase state = PURCHASED (0) and consumption state = YET_TO_CONSUME (0)
   * 5. Credit Firestore quota atomically
   * 6. Acknowledge the purchase (required within 3 days or Google auto-refunds)
   * 7. Store receipt document for idempotency
   */
  async verifyAndCredit(
    uid: string,
    dto: VerifyPurchaseDto,
  ): Promise<{ success: boolean; creditsAdded: number; message: string }> {
    const { purchaseToken, productId } = dto;
    const credits = PRODUCT_CREDITS[productId];

    if (!credits) {
      throw new BadRequestException(`Unknown productId: ${productId}`);
    }

    // ── Idempotency check ──────────────────────────────────────────────────
    const alreadyProcessed = await this.firestoreService.receiptExists(purchaseToken);
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate purchase attempt — token already processed: ${purchaseToken}`);
      throw new ConflictException(
        'This purchase has already been processed. If you believe this is an error, contact support.',
      );
    }

    // ── Verify with Google Play Developer API ─────────────────────────────
    let purchaseData: any;
    try {
      const response = await this.androidPublisher.purchases.products.get({
        packageName: this.packageName,
        productId,
        token: purchaseToken,
      });
      purchaseData = response.data;
    } catch (err) {
      this.logger.error(`Google Play API error: ${err.message}`);
      throw new BadRequestException(
        'Purchase verification failed. The purchase token may be invalid or expired.',
      );
    }

    this.logger.debug(`Play API response: ${JSON.stringify(purchaseData)}`);

    // purchaseState: 0 = PURCHASED, 1 = CANCELLED, 2 = PENDING
    if (purchaseData.purchaseState !== 0) {
      throw new BadRequestException(
        `Purchase is not in PURCHASED state. State: ${purchaseData.purchaseState}`,
      );
    }

    // consumptionState: 0 = YET_TO_CONSUME, 1 = CONSUMED
    // For one-time products we must acknowledge (not consume) unless it's consumable
    if (purchaseData.consumptionState !== 0) {
      throw new ConflictException('Purchase token has already been consumed.');
    }

    // ── Credit quota atomically ────────────────────────────────────────────
    await this.firestoreService.creditQuota(uid, credits);

    // ── Acknowledge purchase (mandatory within 3 days) ────────────────────
    try {
      await this.androidPublisher.purchases.products.acknowledge({
        packageName: this.packageName,
        productId,
        token: purchaseToken,
      });
      this.logger.log(`Purchase acknowledged: ${purchaseToken}`);
    } catch (err) {
      // Don't fail the whole request — quota was already credited.
      // Log for manual follow-up. Google will retry acknowledgement.
      this.logger.error(`Acknowledgement failed (quota already credited): ${err.message}`);
    }

    // ── Store receipt for idempotency ──────────────────────────────────────
    await this.firestoreService.storeReceipt(purchaseToken, {
      uid,
      productId,
      creditsAdded: credits,
      orderId: purchaseData.orderId,
      purchaseTimeMillis: purchaseData.purchaseTimeMillis,
    });

    this.logger.log(
      `Purchase verified & ${credits} credits added to user ${uid} (product: ${productId})`,
    );

    return {
      success: true,
      creditsAdded: credits,
      message: `${credits} credits added to your account.`,
    };
  }
}
