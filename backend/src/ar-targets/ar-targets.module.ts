import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumsModule } from '../albums/albums.module';
import { MediaModule } from '../media/media.module';
import { ArTargetsController } from './ar-targets.controller';
import { ArTargetsService } from './ar-targets.service';
import { ArTarget, ArTargetSchema } from './schemas/ar-target.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ArTarget.name, schema: ArTargetSchema }]),
    AlbumsModule,
    MediaModule,
  ],
  controllers: [ArTargetsController],
  providers: [ArTargetsService],
  exports: [ArTargetsService, MongooseModule],
})
export class ArTargetsModule {}
