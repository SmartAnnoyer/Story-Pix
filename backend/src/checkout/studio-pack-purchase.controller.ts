import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces';
import { CheckoutService } from './checkout.service';
import { CreateRechargeOrderDto, VerifyCheckoutPaymentDto } from './dto/checkout.dto';

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
}
