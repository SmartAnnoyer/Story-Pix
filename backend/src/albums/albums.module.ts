import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Album, AlbumSchema } from './schemas/album.schema';
import { AlbumsService } from './albums.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }]),
    SubscriptionsModule,
    AnalyticsModule,
    forwardRef(() => NotificationsModule),
  ],
  providers: [AlbumsService],
  exports: [AlbumsService, MongooseModule],
})
export class AlbumsModule {}
