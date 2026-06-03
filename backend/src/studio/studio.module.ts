import { Module } from '@nestjs/common';
import { StudiosModule } from '../studios/studios.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AlbumsModule } from '../albums/albums.module';
import { StudioProfileController } from './studio-profile.controller';
import { StudioSubscriptionController } from './studio-subscription.controller';
import { AlbumsController } from '../albums/albums.controller';
import { MediaModule } from '../media/media.module';
import { ArTargetsModule } from '../ar-targets/ar-targets.module';
import { ViewerModule } from '../viewer/viewer.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [StudiosModule, SubscriptionsModule, AlbumsModule, MediaModule, ArTargetsModule, ViewerModule, AnalyticsModule],
  controllers: [StudioProfileController, StudioSubscriptionController, AlbumsController],
})
export class StudioModule {}