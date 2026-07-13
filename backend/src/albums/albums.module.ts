import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MindArModule } from '../mind-ar/mind-ar.module';
import { Album, AlbumSchema } from './schemas/album.schema';
import { ArTarget, ArTargetSchema } from '../ar-targets/schemas/ar-target.schema';
import { AlbumsService } from './albums.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Album.name, schema: AlbumSchema },
      { name: ArTarget.name, schema: ArTargetSchema },
    ]),
    SubscriptionsModule,
    AnalyticsModule,
    forwardRef(() => NotificationsModule),
    MindArModule,
  ],
  providers: [AlbumsService],
  exports: [AlbumsService, MongooseModule],
})
export class AlbumsModule {}
