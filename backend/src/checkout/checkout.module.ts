import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingProviderModule } from '../billing/billing-provider.module';
import { PacksModule } from '../packs/packs.module';
import { CouponsModule } from '../coupons/coupons.module';
import { StudiosModule } from '../studios/studios.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { CheckoutOrder, CheckoutOrderSchema } from './schemas/checkout-order.schema';
import { CheckoutService } from './checkout.service';
import { PublicCheckoutController } from './public-checkout.controller';
import { StudioPackPurchaseController } from './studio-pack-purchase.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CheckoutOrder.name, schema: CheckoutOrderSchema }]),
    BillingProviderModule,
    PacksModule,
    CouponsModule,
    StudiosModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [PublicCheckoutController, StudioPackPurchaseController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
