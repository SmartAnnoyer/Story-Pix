import { Module } from '@nestjs/common';
import { StudiosModule } from '../studios/studios.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminStudiosController } from './admin-studios.controller';
import { AdminPlansController } from './admin-plans.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PacksModule } from '../packs/packs.module';
import { CouponsModule } from '../coupons/coupons.module';
import { AlbumsModule } from '../albums/albums.module';
import { AdminPacksController } from './admin-packs.controller';
import { AdminCouponsController } from './admin-coupons.controller';

@Module({
  imports: [
    StudiosModule,
    PlansModule,
    SubscriptionsModule,
    AnalyticsModule,
    PacksModule,
    CouponsModule,
    AlbumsModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminStudiosController,
    AdminPlansController,
    AdminSubscriptionsController,
    AdminPacksController,
    AdminCouponsController,
  ],
})
export class AdminModule {}
