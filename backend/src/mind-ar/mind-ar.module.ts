import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';
import { ArTarget, ArTargetSchema } from '../ar-targets/schemas/ar-target.schema';
import { MediaModule } from '../media/media.module';
import { StorageModule } from '../storage/storage.module';
import { MindArCompilerService } from './mind-ar-compiler.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Album.name, schema: AlbumSchema },
      { name: ArTarget.name, schema: ArTargetSchema },
    ]),
    MediaModule,
    StorageModule,
  ],
  providers: [MindArCompilerService],
  exports: [MindArCompilerService],
})
export class MindArModule {}
