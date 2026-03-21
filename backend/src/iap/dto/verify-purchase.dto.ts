import { IsString, IsIn } from 'class-validator';

// Valid product IDs as defined in Google Play Console
export const VALID_PRODUCT_IDS = ['test_pack', 'quota_starter_50', 'quota_pro_150', 'quota_growth_500'];

export class VerifyPurchaseDto {
  @IsString()
  purchaseToken: string;

  @IsString()
  @IsIn(VALID_PRODUCT_IDS, {
    message: `productId must be one of: ${VALID_PRODUCT_IDS.join(', ')}`,
  })
  productId: string;
}
