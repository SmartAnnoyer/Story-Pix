import { Module } from '@nestjs/common';
import { StudiosModule } from '../studios/studios.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminStudiosController } from './admin-studios.controller';
import { AdminPlansController } from './admin-plans.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [StudiosModule, PlansModule, SubscriptionsModule, AnalyticsModule],
  controllers: [
    AdminDashboardController,
    AdminStudiosController,
    AdminPlansController,
    AdminSubscriptionsController,
  ],
})
export class AdminModule {}
