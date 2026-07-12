import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';
import { AlbumsModule } from '../albums/albums.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ArTargetsModule } from '../ar-targets/ar-targets.module';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { MediaModule } from '../media/media.module';
import { StorageModule } from '../storage/storage.module';
import { Studio, StudioSchema } from '../studios/schemas/studio.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { MindArModule } from '../mind-ar/mind-ar.module';
import { ViewerController } from './viewer.controller';
import { ViewerService } from './viewer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Album.name, schema: AlbumSchema },
      { name: Studio.name, schema: StudioSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
    AlbumsModule,
    ArTargetsModule,
    MediaModule,
    StorageModule,
    SubscriptionsModule,
    AnalyticsModule,
    MindArModule,
  ],
  controllers: [ViewerController],
  providers: [ViewerService],
})
export class ViewerModule {}
