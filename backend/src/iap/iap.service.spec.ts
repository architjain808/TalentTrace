import { Test, TestingModule } from '@nestjs/testing';
import { IapService, PRODUCTS } from './iap.service';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../firebase/firestore.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

// ─── Firestore mock ───────────────────────────────────────────────────────────
const mockFirestoreService = {
  receiptExists: jest.fn(),
  creditQuota: jest.fn(),
  storeReceipt: jest.fn(),
};

// ─── Google Play API mock ─────────────────────────────────────────────────────
// Provide stable fn references so tests can configure return values.
const mockGet = jest.fn();
const mockAcknowledge = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({})),
    },
    // androidpublisher returns an object using the stable fns above.
    // We access them via the module-scoped vars (same reference = no TDZ).
    androidpublisher: () => ({
      purchases: {
        products: {
          get: (...args: any[]) => mockGet(...args),
          acknowledge: (...args: any[]) => mockAcknowledge(...args),
        },
      },
    }),
  },
}));

// ─── ConfigService mock ───────────────────────────────────────────────────────
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('com.talenttrace.app'),
  get: jest.fn().mockReturnValue('./play-service-account.json'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('IapService', () => {
  let service: IapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IapService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: FirestoreService, useValue: mockFirestoreService },
      ],
    }).compile();

    service = module.get<IapService>(IapService);
    jest.clearAllMocks();
  });

  // ── getProducts ─────────────────────────────────────────────────────────────
  describe('getProducts', () => {
    it('should return the product catalogue', () => {
      const result = service.getProducts();
      expect(result.products).toHaveLength(PRODUCTS.length);
      expect(result.products[0]).toHaveProperty('id');
      expect(result.products[0]).toHaveProperty('credits');
    });
  });

  // ── verifyAndCredit ─────────────────────────────────────────────────────────
  describe('verifyAndCredit', () => {
    const uid = 'test-user-uid';
    const dto = {
      purchaseToken: 'valid-purchase-token-abc123',
      productId: 'quota_starter_50',
    };

    it('should credit quota for a valid new purchase', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(false);
      mockGet.mockResolvedValue({
        data: {
          purchaseState: 0,
          consumptionState: 0,
          orderId: 'GPA.1234',
          purchaseTimeMillis: '1710000000000',
        },
      });
      mockAcknowledge.mockResolvedValue({});
      mockFirestoreService.creditQuota.mockResolvedValue(undefined);
      mockFirestoreService.storeReceipt.mockResolvedValue(undefined);

      const result = await service.verifyAndCredit(uid, dto);

      expect(result.success).toBe(true);
      expect(result.creditsAdded).toBe(50);
      expect(mockFirestoreService.creditQuota).toHaveBeenCalledWith(uid, 50);
      expect(mockFirestoreService.storeReceipt).toHaveBeenCalledWith(
        dto.purchaseToken,
        expect.objectContaining({ uid, productId: dto.productId, creditsAdded: 50 }),
      );
    });

    it('should throw ConflictException for a duplicate purchase token', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(true);

      await expect(service.verifyAndCredit(uid, dto)).rejects.toThrow(ConflictException);
      expect(mockFirestoreService.creditQuota).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Google Play returns non-PURCHASED state', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(false);
      mockGet.mockResolvedValue({
        data: { purchaseState: 1, consumptionState: 0 },
      });

      await expect(service.verifyAndCredit(uid, dto)).rejects.toThrow(BadRequestException);
      expect(mockFirestoreService.creditQuota).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when Google Play API call fails', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(false);
      mockGet.mockRejectedValue(new Error('API quota exceeded'));

      await expect(service.verifyAndCredit(uid, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an unknown productId', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(false);

      await expect(
        service.verifyAndCredit(uid, { ...dto, productId: 'quota_unknown' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should still succeed if acknowledgement fails (quota already credited)', async () => {
      mockFirestoreService.receiptExists.mockResolvedValue(false);
      mockGet.mockResolvedValue({
        data: { purchaseState: 0, consumptionState: 0, orderId: 'GPA.5678' },
      });
      mockAcknowledge.mockRejectedValue(new Error('Network error'));
      mockFirestoreService.creditQuota.mockResolvedValue(undefined);
      mockFirestoreService.storeReceipt.mockResolvedValue(undefined);

      const result = await service.verifyAndCredit(uid, dto);
      // Acknowledgement failure is non-fatal — quota was already credited
      expect(result.success).toBe(true);
    });
  });
});
