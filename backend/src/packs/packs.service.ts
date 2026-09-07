import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AlbumPackTier, PackLedgerAction } from '../common/enums';
import { SCANS_PER_MAPPING } from '../common/constants/pack.constants';
import { AlbumPack, AlbumPackDocument } from './schemas/album-pack.schema';
import { StudioPackCredit, StudioPackCreditDocument } from './schemas/studio-pack-credit.schema';
import { PackLedgerEntry, PackLedgerEntryDocument } from './schemas/pack-ledger.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import {
  AssignPackDto,
  CreateAlbumPackDto,
  QueryPackLedgerDto,
  UpdateAlbumPackDto,
} from './dto/pack.dto';

/**
 * Sell by photo count + album bundles.
 * Every mapped photo always gets SCANS_PER_MAPPING (1000) plays — not a marketing upsell.
 *
 * Bundle packs = multiple album credits for busy shops (discount), not extra scans.
 */
const DEFAULT_PACKS: Array<
  Omit<CreateAlbumPackDto, 'features'> & {
    features: string[];
    sortOrder: number;
    isActive?: boolean;
  }
> = [
  {
    code: 'mini_10',
    name: 'Mini Album',
    tier: AlbumPackTier.MINIMAL,
    description: 'Smaller album — up to 10 living photos. Each photo gets 1,000 guest plays.',
    maxMappings: 10,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 999,
    features: ['Up to 10 photos', '1,000 plays per photo', 'Lifetime hosting'],
    sortOrder: 10,
  },
  {
    code: 'standard_25',
    name: 'Standard Album',
    tier: AlbumPackTier.STANDARD,
    description: 'Full album — up to 25 living photos. Each photo gets 1,000 guest plays.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 2499,
    features: ['Up to 25 photos', '1,000 plays per photo', 'Lifetime hosting'],
    sortOrder: 20,
  },
  {
    code: 'bundle_5_albums',
    name: '5-Album Bundle',
    tier: AlbumPackTier.VOLUME,
    description:
      'Busy shops: pay once for 5 Standard albums (5 clients). Each album up to 25 photos · 1,000 plays/photo. ~10% off.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 5,
    unitPriceInr: 11249,
    features: ['5 album credits', 'Up to 25 photos each', '1,000 plays per photo', '~10% off'],
    sortOrder: 40,
  },
  {
    code: 'bundle_10_albums',
    name: '10-Album Bundle',
    tier: AlbumPackTier.VOLUME,
    description:
      'Growing studios: 10 Standard albums in one purchase. ~20% off vs buying one-by-one.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 10,
    unitPriceInr: 19999,
    features: ['10 album credits', 'Up to 25 photos each', '1,000 plays per photo', '~20% off'],
    sortOrder: 50,
  },
  {
    code: 'bundle_20_albums',
    name: '20-Album Bundle',
    tier: AlbumPackTier.VOLUME,
    description: 'High-volume shops: 20 Standard albums in one purchase. Best rate (~30% off).',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 20,
    unitPriceInr: 34999,
    features: ['20 album credits', 'Up to 25 photos each', '1,000 plays per photo', '~30% off'],
    sortOrder: 60,
  },
];

/** Legacy pack codes deactivated in favor of clearer Mini / Standard / Bundle names. */
const LEGACY_PACK_CODES = [
  'minimal_10',
  'professional_25',
  'volume_5_standard',
  'volume_10_standard',
  'volume_20_standard',
];

export type ConsumedPackCredit = {
  creditId: string;
  packId: string;
  packCode: string;
  packName: string;
  maxMappings: number;
  scansPerMapping: number;
};

@Injectable()
export class PacksService implements OnModuleInit {
  constructor(
    @InjectModel(AlbumPack.name) private readonly packModel: Model<AlbumPackDocument>,
    @InjectModel(StudioPackCredit.name)
    private readonly creditModel: Model<StudioPackCreditDocument>,
    @InjectModel(PackLedgerEntry.name)
    private readonly ledgerModel: Model<PackLedgerEntryDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPacks();
  }

  async findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    const packs = await this.packModel.find(filter).sort({ sortOrder: 1, unitPriceInr: 1 }).exec();
    return packs.map((pack) => this.serializePack(pack));
  }

  async findById(id: string) {
    const pack = await this.packModel.findById(id).exec();
    if (!pack) throw new NotFoundException('Pack not found');
    return this.serializePack(pack);
  }

  async create(dto: CreateAlbumPackDto) {
    const code = dto.code.trim().toLowerCase();
    const existing = await this.packModel.findOne({ code }).exec();
    if (existing) throw new BadRequestException('Pack code already exists');

    const pack = await this.packModel.create({
      ...dto,
      code,
      features: dto.features ?? [],
      isActive: true,
      sortOrder: dto.sortOrder ?? 100,
    });
    return this.serializePack(pack);
  }

  async update(id: string, dto: UpdateAlbumPackDto) {
    const pack = await this.packModel.findById(id).exec();
    if (!pack) throw new NotFoundException('Pack not found');
    Object.assign(pack, dto);
    await pack.save();
    return this.serializePack(pack);
  }

  async setActive(id: string, isActive: boolean) {
    const pack = await this.packModel.findById(id).exec();
    if (!pack) throw new NotFoundException('Pack not found');
    pack.isActive = isActive;
    await pack.save();
    return this.serializePack(pack);
  }

  async assignToStudio(dto: AssignPackDto, performedBy: string) {
    const pack = await this.packModel.findById(dto.packId).exec();
    if (!pack || !pack.isActive) throw new NotFoundException('Pack not found or inactive');

    const quantity = dto.quantity ?? 1;
    const creditsGranted = pack.albumsIncluded * quantity;
    const totalPriceInr = pack.unitPriceInr * quantity;

    const credit = await this.creditModel.create({
      studioId: new Types.ObjectId(dto.studioId),
      packId: pack._id,
      packCode: pack.code,
      packName: pack.name,
      maxMappings: pack.maxMappings,
      scanLimit: SCANS_PER_MAPPING,
      totalCredits: creditsGranted,
      remainingCredits: creditsGranted,
      unitPriceInr: pack.unitPriceInr,
      totalPriceInr,
      assignedBy: new Types.ObjectId(performedBy),
      notes: dto.notes ?? null,
      isActive: true,
    });

    await this.ledgerModel.create({
      studioId: credit.studioId,
      packId: pack._id,
      creditId: credit._id,
      albumId: null,
      packCode: pack.code,
      packName: pack.name,
      action: PackLedgerAction.ASSIGN,
      quantity: creditsGranted,
      unitPriceInr: pack.unitPriceInr,
      totalPriceInr,
      performedBy: new Types.ObjectId(performedBy),
      notes: dto.notes ?? null,
    });

    return this.serializeCredit(credit);
  }

  async listStudioCredits(studioId: string) {
    const credits = await this.creditModel
      .find({ studioId: new Types.ObjectId(studioId), isActive: true })
      .sort({ createdAt: -1 })
      .exec();
    return credits.map((credit) => this.serializeCredit(credit));
  }

  async getStudioPackSummary(studioId: string) {
    const credits = await this.listStudioCredits(studioId);
    const remainingAlbumCredits = credits.reduce((sum, item) => sum + item.remainingCredits, 0);
    const totalAssigned = credits.reduce((sum, item) => sum + item.totalCredits, 0);
    const usedCredits = totalAssigned - remainingAlbumCredits;

    return {
      remainingAlbumCredits,
      totalAssignedCredits: totalAssigned,
      usedCredits,
      credits,
    };
  }

  async consumeCreditForAlbum(input: {
    studioId: string;
    packCreditId?: string;
    albumId: string;
    performedBy: string;
  }): Promise<ConsumedPackCredit> {
    const studioObjectId = new Types.ObjectId(input.studioId);
    let credit: StudioPackCreditDocument | null = null;

    if (input.packCreditId) {
      credit = await this.creditModel
        .findOne({
          _id: input.packCreditId,
          studioId: studioObjectId,
          isActive: true,
          remainingCredits: { $gt: 0 },
        })
        .exec();
      if (!credit) {
        throw new BadRequestException('Selected pack credit is not available');
      }
    } else {
      credit = await this.creditModel
        .findOne({
          studioId: studioObjectId,
          isActive: true,
          remainingCredits: { $gt: 0 },
        })
        .sort({ createdAt: 1 })
        .exec();
      if (!credit) {
        throw new ForbiddenException({
          message: 'No album pack credits left. Ask Story-PIX admin to enable a pack.',
          code: 'PACK_CREDITS_EXHAUSTED',
        });
      }
    }

    credit.remainingCredits -= 1;
    await credit.save();

    await this.ledgerModel.create({
      studioId: studioObjectId,
      packId: credit.packId,
      creditId: credit._id,
      albumId: new Types.ObjectId(input.albumId),
      packCode: credit.packCode,
      packName: credit.packName,
      action: PackLedgerAction.CONSUME,
      quantity: 1,
      unitPriceInr: credit.unitPriceInr,
      totalPriceInr: 0,
      performedBy: new Types.ObjectId(input.performedBy),
      notes: null,
    });

    return {
      creditId: credit._id.toString(),
      packId: credit.packId.toString(),
      packCode: credit.packCode,
      packName: credit.packName,
      maxMappings: credit.maxMappings,
      // Trust floor — never stamp fewer than 1000 plays per photo.
      scansPerMapping: SCANS_PER_MAPPING,
    };
  }

  async listLedger(query: QueryPackLedgerDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (query.studioId) filter.studioId = new Types.ObjectId(query.studioId);

    const [items, total] = await Promise.all([
      this.ledgerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.ledgerModel.countDocuments(filter).exec(),
    ]);

    const studioIds = [...new Set(items.map((entry) => entry.studioId.toString()))];
    const studios = studioIds.length
      ? await this.studioModel
          .find({ _id: { $in: studioIds.map((id) => new Types.ObjectId(id)) } })
          .select({ studioName: 1, studioCode: 1 })
          .lean()
          .exec()
      : [];
    const studioById = new Map(
      studios.map((studio) => [
        studio._id.toString(),
        {
          studioName: studio.studioName as string,
          studioCode: (studio.studioCode as string) ?? null,
        },
      ]),
    );

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items: items.map((entry) => {
        const studio = studioById.get(entry.studioId.toString());
        return this.serializeLedger(entry, studio?.studioName ?? null, studio?.studioCode ?? null);
      }),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  serializePack(pack: AlbumPackDocument) {
    const doc = pack as AlbumPackDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: pack._id.toString(),
      code: pack.code,
      name: pack.name,
      tier: pack.tier,
      description: pack.description ?? null,
      maxMappings: pack.maxMappings,
      scansPerMapping: pack.scanLimit || SCANS_PER_MAPPING,
      albumsIncluded: pack.albumsIncluded,
      unitPriceInr: pack.unitPriceInr,
      features: pack.features ?? [],
      isActive: pack.isActive,
      sortOrder: pack.sortOrder ?? 0,
      createdAt: doc.createdAt?.toISOString() ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    };
  }

  serializeCredit(credit: StudioPackCreditDocument) {
    const doc = credit as StudioPackCreditDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: credit._id.toString(),
      studioId: credit.studioId.toString(),
      packId: credit.packId.toString(),
      packCode: credit.packCode,
      packName: credit.packName,
      maxMappings: credit.maxMappings,
      scansPerMapping: credit.scanLimit || SCANS_PER_MAPPING,
      totalCredits: credit.totalCredits,
      remainingCredits: credit.remainingCredits,
      unitPriceInr: credit.unitPriceInr,
      totalPriceInr: credit.totalPriceInr,
      assignedBy: credit.assignedBy.toString(),
      notes: credit.notes ?? null,
      isActive: credit.isActive,
      createdAt: doc.createdAt?.toISOString() ?? null,
      updatedAt: doc.updatedAt?.toISOString() ?? null,
    };
  }

  serializeLedger(
    entry: PackLedgerEntryDocument,
    studioName: string | null = null,
    studioCode: string | null = null,
  ) {
    const doc = entry as PackLedgerEntryDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: entry._id.toString(),
      studioId: entry.studioId.toString(),
      studioName,
      studioCode,
      packId: entry.packId.toString(),
      creditId: entry.creditId?.toString() ?? null,
      albumId: entry.albumId?.toString() ?? null,
      packCode: entry.packCode,
      packName: entry.packName,
      action: entry.action,
      quantity: entry.quantity,
      unitPriceInr: entry.unitPriceInr,
      totalPriceInr: entry.totalPriceInr,
      performedBy: entry.performedBy?.toString() ?? null,
      notes: entry.notes ?? null,
      createdAt: doc.createdAt?.toISOString() ?? null,
    };
  }

  private async seedDefaultPacks() {
    for (const pack of DEFAULT_PACKS) {
      await this.packModel.updateOne(
        { code: pack.code },
        {
          $set: {
            name: pack.name,
            tier: pack.tier,
            description: pack.description,
            maxMappings: pack.maxMappings,
            scanLimit: SCANS_PER_MAPPING,
            albumsIncluded: pack.albumsIncluded,
            unitPriceInr: pack.unitPriceInr,
            features: pack.features,
            sortOrder: pack.sortOrder,
            isActive: true,
          },
          $setOnInsert: { code: pack.code },
        },
        { upsert: true },
      );
    }

    await this.packModel.updateMany(
      { code: { $in: LEGACY_PACK_CODES } },
      { $set: { isActive: false } },
    );
  }
}
