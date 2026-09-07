import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumPack, AlbumPackSchema } from './schemas/album-pack.schema';
import { StudioPackCredit, StudioPackCreditSchema } from './schemas/studio-pack-credit.schema';
import { PackLedgerEntry, PackLedgerEntrySchema } from './schemas/pack-ledger.schema';
import { Studio, StudioSchema } from '../studios/schemas/studio.schema';
import { PacksService } from './packs.service';
import { StudioPacksController } from './studio-packs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AlbumPack.name, schema: AlbumPackSchema },
      { name: StudioPackCredit.name, schema: StudioPackCreditSchema },
      { name: PackLedgerEntry.name, schema: PackLedgerEntrySchema },
      { name: Studio.name, schema: StudioSchema },
    ]),
  ],
  controllers: [StudioPacksController],
  providers: [PacksService],
  exports: [PacksService, MongooseModule],
})
export class PacksModule {}
