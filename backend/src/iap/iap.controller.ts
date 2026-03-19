import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { IapService } from './iap.service';
import { VerifyPurchaseDto } from './dto/verify-purchase.dto';

@Controller('iap')
export class IapController {
  constructor(private readonly iapService: IapService) {}

  /**
   * GET /iap/products
   * Public — no auth needed.
   * Returns the quota pack catalogue so the app can display prices.
   */
  @Get('products')
  getProducts() {
    return this.iapService.getProducts();
  }

  /**
   * POST /iap/verify-purchase
   * Protected — requires valid Firebase ID token in Authorization header.
   *
   * Body: { purchaseToken: string, productId: string }
   *
   * Flow:
   *   1. Guard verifies Firebase ID token → injects req.user.uid
   *   2. Service verifies purchaseToken with Google Play Developer API
   *   3. Credits quota in Firestore
   *   4. Acknowledges purchase (mandatory to prevent auto-refund)
   *   5. Stores idempotent receipt
   */
  @Post('verify-purchase')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPurchase(@Req() req: any, @Body() dto: VerifyPurchaseDto) {
    const uid: string = req.user.uid;
    return this.iapService.verifyAndCredit(uid, dto);
  }
}
