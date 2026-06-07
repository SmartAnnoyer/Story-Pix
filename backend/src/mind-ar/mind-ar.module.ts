import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';
import { ArTarget, ArTargetSchema } from '../ar-targets/schemas/ar-target.schema';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { StorageModule } from '../storage/storage.module';
import { MindArCompilerService } from './mind-ar-compiler.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Album.name, schema: AlbumSchema },
      { name: ArTarget.name, schema: ArTargetSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
    StorageModule,
  ],
  providers: [MindArCompilerService],
  exports: [MindArCompilerService],
})
export class MindArModule {}
