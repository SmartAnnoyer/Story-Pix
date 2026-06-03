import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumsModule } from '../albums/albums.module';
import { PlansModule } from '../plans/plans.module';
import { StorageModule } from '../storage/storage.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaController } from './media.controller';
import { MediaLimitService } from './media-limit.service';
import { MediaProcessingService } from './media-processing.service';
import { MediaValidationService } from './media-validation.service';
import { MediaService } from './media.service';
import { Media, MediaSchema } from './schemas/media.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
    StorageModule,
    SubscriptionsModule,
    PlansModule,
    AlbumsModule,
    AnalyticsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaValidationService,
    MediaLimitService,
    MediaProcessingService,
  ],
  exports: [MediaService, MongooseModule],
})
export class MediaModule {}
