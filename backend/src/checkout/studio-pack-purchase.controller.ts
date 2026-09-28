import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces';
import { CheckoutService } from './checkout.service';
import {
  CreateRechargeOrderDto,
  ScanRenewalDto,
  VerifyCheckoutPaymentDto,
} from './dto/checkout.dto';

@Controller('studio/packs/purchase')
@Roles(Role.STUDIO_ADMIN)
export class StudioPackPurchaseController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('order')
  @RequirePermissions('album:read')
  createOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRechargeOrderDto) {
    return this.checkoutService.createRechargeOrder(user.studioId!, user.userId, dto);
  }

  @Post('verify')
  @RequirePermissions('album:read')
  verify(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCheckoutPaymentDto) {
    return this.checkoutService.verifyRechargePayment(user.studioId!, user.userId, dto);
  }

  @Post('renewal/quote')
  @RequirePermissions('album:read')
  quoteRenewal(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScanRenewalDto) {
    return this.checkoutService.quoteRenewal(user.studioId!, dto);
  }

  @Post('renewal/order')
  @RequirePermissions('album:read')
  createRenewalOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: ScanRenewalDto) {
    return this.checkoutService.createRenewalOrder(user.studioId!, user.userId, dto);
  }

  @Post('renewal/verify')
  @RequirePermissions('album:read')
  verifyRenewal(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCheckoutPaymentDto) {
    return this.checkoutService.verifyRenewalPayment(user.studioId!, user.userId, dto);
  }
}
