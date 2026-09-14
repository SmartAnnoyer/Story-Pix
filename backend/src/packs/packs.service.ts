import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AlbumPackTier, ArTargetStatus, PackLedgerAction } from '../common/enums';
import { SCANS_PER_MAPPING } from '../common/constants/pack.constants';
import { AlbumPack, AlbumPackDocument } from './schemas/album-pack.schema';
import { StudioPackCredit, StudioPackCreditDocument } from './schemas/studio-pack-credit.schema';
import { PackLedgerEntry, PackLedgerEntryDocument } from './schemas/pack-ledger.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import { ArTarget, ArTargetDocument } from '../ar-targets/schemas/ar-target.schema';
import {
  AssignPackDto,
  CreateAlbumPackDto,
  QueryPackLedgerDto,
  UpdateAlbumPackDto,
} from './dto/pack.dto';

/**
 * Sell by photo-mapping slots (pooled across the studio).
 * Albums are unlimited (each gets its own QR); packs only add mapping capacity.
 * Every mapped photo always gets SCANS_PER_MAPPING (1000) plays.
 *
 * Bundle packs = discounted bulk mapping slots (albumsIncluded × maxMappings).
 */
const DEFAULT_PACKS: Array<
  Omit<CreateAlbumPackDto, 'features'> & {
    features: string[];
    sortOrder: number;
    isActive?: boolean;
  }
> = [
  {
    code: 'photo_1',
    name: '1 Photo',
    tier: AlbumPackTier.PERSONAL,
    description: 'One living photo — perfect for a single gift. 1,000 guest plays.',
    maxMappings: 1,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 199,
    features: ['1 living photo', '1,000 plays', 'Stackable · unlimited albums'],
    sortOrder: 1,
  },
  {
    code: 'photo_2',
    name: '2 Photos',
    tier: AlbumPackTier.PERSONAL,
    description:
      'Two living photos. Combine with other packs (e.g. 2+3=5). Split across albums as you like.',
    maxMappings: 2,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 349,
    features: ['2 living photos', '1,000 plays each', 'Stackable · unlimited albums'],
    sortOrder: 2,
  },
  {
    code: 'photo_3',
    name: '3 Photos',
    tier: AlbumPackTier.PERSONAL,
    description: 'Three living photos — great for a small set. Stackable.',
    maxMappings: 3,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 499,
    features: ['3 living photos', '1,000 plays each', 'Stackable'],
    sortOrder: 3,
  },
  {
    code: 'photo_4',
    name: '4 Photos',
    tier: AlbumPackTier.PERSONAL,
    description: 'Four living photos. Add another pack anytime to grow.',
    maxMappings: 4,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 649,
    features: ['4 living photos', '1,000 plays each', 'Stackable'],
    sortOrder: 4,
  },
  {
    code: 'photo_5',
    name: '5 Photos',
    tier: AlbumPackTier.PERSONAL,
    description: 'Five living photos. Want 8? Add a 3-photo pack.',
    maxMappings: 5,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 799,
    features: ['5 living photos', '1,000 plays each', 'Stackable'],
    sortOrder: 5,
  },
  {
    code: 'mini_10',
    name: 'Mini',
    tier: AlbumPackTier.MINIMAL,
    description:
      '10 living-photo slots for your studio. Split across any number of albums (each album has its own QR).',
    maxMappings: 10,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 999,
    features: ['10 photo mappings', 'Unlimited albums / QRs', '1,000 plays per photo'],
    sortOrder: 10,
  },
  {
    code: 'standard_25',
    name: 'Standard',
    tier: AlbumPackTier.STANDARD,
    description:
      '25 living-photo slots. Create as many albums as you need and share capacity across them.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 1,
    unitPriceInr: 2499,
    features: ['25 photo mappings', 'Unlimited albums / QRs', '1,000 plays per photo'],
    sortOrder: 20,
  },
  {
    code: 'bundle_5_albums',
    name: '5-Album Bundle',
    tier: AlbumPackTier.VOLUME,
    description:
      'Busy shops: 125 living-photo slots (5×25). Split across as many albums/QRs as you want. ~10% off.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 5,
    unitPriceInr: 11249,
    features: ['125 photo mappings', 'Unlimited albums / QRs', '1,000 plays per photo', '~10% off'],
    sortOrder: 40,
  },
  {
    code: 'bundle_10_albums',
    name: '10× Standard Bundle',
    tier: AlbumPackTier.VOLUME,
    description:
      'Growing studios: 250 living-photo slots. Split across any number of albums. ~20% off.',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 10,
    unitPriceInr: 19999,
    features: ['250 photo mappings', 'Unlimited albums / QRs', '1,000 plays per photo', '~20% off'],
    sortOrder: 50,
  },
  {
    code: 'bundle_20_albums',
    name: '20× Standard Bundle',
    tier: AlbumPackTier.VOLUME,
    description: 'High-volume shops: 500 living-photo slots. Best rate (~30% off).',
    maxMappings: 25,
    scanLimit: SCANS_PER_MAPPING,
    albumsIncluded: 20,
    unitPriceInr: 34999,
    features: ['500 photo mappings', 'Unlimited albums / QRs', '1,000 plays per photo', '~30% off'],
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

export type MappingQuota = {
  grantedMappingSlots: number;
  usedMappingSlots: number;
  remainingMappingSlots: number;
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
    @InjectModel(ArTarget.name) private readonly arTargetModel: Model<ArTargetDocument>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPacks();
    await this.normalizeLegacyAlbumCredits();
  }

  /** Mapping slots granted by one pack purchase line. */
  mappingSlotsFromPack(pack: { maxMappings: number; albumsIncluded: number }, quantity = 1) {
    const qty = Math.max(1, Math.floor(quantity || 1));
    return Math.max(0, pack.maxMappings) * Math.max(1, pack.albumsIncluded) * qty;
  }

  async countUsedMappingSlots(studioId: string) {
    // Match both ObjectId and legacy string studioId values.
    const studioFilter = Types.ObjectId.isValid(studioId)
      ? { $in: [studioId, new Types.ObjectId(studioId)] }
      : studioId;
    return this.arTargetModel
      .countDocuments({
        studioId: studioFilter,
        status: { $ne: ArTargetStatus.ARCHIVED },
        deletedAt: null,
      })
      .exec();
  }

  async getMappingQuota(studioId: string): Promise<MappingQuota> {
    await this.normalizeLegacyAlbumCredits(studioId);
    const credits = await this.creditModel
      .find({ studioId: new Types.ObjectId(studioId), isActive: true })
      .exec();
    const grantedMappingSlots = credits.reduce((sum, credit) => sum + credit.totalCredits, 0);
    const usedMappingSlots = await this.countUsedMappingSlots(studioId);
    return {
      grantedMappingSlots,
      usedMappingSlots,
      remainingMappingSlots: Math.max(0, grantedMappingSlots - usedMappingSlots),
    };
  }

  async assertStudioHasMappingSlot(studioId: string) {
    const quota = await this.getMappingQuota(studioId);
    if (quota.remainingMappingSlots <= 0) {
      throw new ForbiddenException({
        message:
          'No photo-mapping slots left. Buy or recharge a pack to link more print → video photos.',
        code: 'PACK_MAPPING_SLOTS_EXHAUSTED',
        details: quota,
      });
    }
    return quota;
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

  async assignToStudio(dto: AssignPackDto, performedBy?: string | null) {
    const pack = await this.packModel.findById(dto.packId).exec();
    if (!pack || !pack.isActive) throw new NotFoundException('Pack not found or inactive');

    const quantity = dto.quantity ?? 1;
    const slotsGranted = this.mappingSlotsFromPack(pack, quantity);
    const totalPriceInr = pack.unitPriceInr * quantity;

    const credit = await this.creditModel.create({
      studioId: new Types.ObjectId(dto.studioId),
      packId: pack._id,
      packCode: pack.code,
      packName: pack.name,
      maxMappings: pack.maxMappings,
      scanLimit: SCANS_PER_MAPPING,
      totalCredits: slotsGranted,
      remainingCredits: slotsGranted,
      creditUnit: 'mapping',
      unitPriceInr: pack.unitPriceInr,
      totalPriceInr,
      assignedBy: performedBy ? new Types.ObjectId(performedBy) : null,
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
      action: performedBy ? PackLedgerAction.ASSIGN : PackLedgerAction.PURCHASE,
      quantity: slotsGranted,
      unitPriceInr: pack.unitPriceInr,
      totalPriceInr,
      performedBy: performedBy ? new Types.ObjectId(performedBy) : null,
      notes: dto.notes ?? null,
    });

    return this.serializeCredit(credit);
  }

  /**
   * Fulfill a cart. Personal packs in the same cart merge into one credit row
   * (5+3 → 8 mapping slots). Studio packs each grant maxMappings × albumsIncluded × qty.
   */
  async fulfillCart(
    studioId: string,
    items: Array<{ packId: string; quantity: number }>,
    performedBy?: string | null,
    notes?: string | null,
    idempotencyKey?: string | null,
  ) {
    if (!items.length) throw new BadRequestException('Cart is empty');

    if (idempotencyKey) {
      const alreadyGranted = await this.ledgerModel
        .findOne({
          studioId: new Types.ObjectId(studioId),
          notes: idempotencyKey,
          action: PackLedgerAction.PURCHASE,
        })
        .exec();
      if (alreadyGranted) {
        return [];
      }
    }

    const resolved: Array<{
      pack: AlbumPackDocument;
      quantity: number;
    }> = [];

    for (const item of items) {
      const quantity = Math.max(1, Math.floor(item.quantity || 1));
      const pack = await this.packModel.findById(item.packId).exec();
      if (!pack || !pack.isActive) {
        throw new NotFoundException(`Pack not found or inactive: ${item.packId}`);
      }
      resolved.push({ pack, quantity });
    }

    const personal = resolved.filter((row) => row.pack.tier === AlbumPackTier.PERSONAL);
    const rest = resolved.filter((row) => row.pack.tier !== AlbumPackTier.PERSONAL);
    const results: ReturnType<typeof this.serializeCredit>[] = [];

    if (personal.length) {
      const totalMappings = personal.reduce(
        (sum, row) => sum + this.mappingSlotsFromPack(row.pack, row.quantity),
        0,
      );
      const totalPriceInr = personal.reduce(
        (sum, row) => sum + row.pack.unitPriceInr * row.quantity,
        0,
      );
      const codes = personal.map((row) => `${row.pack.code}×${row.quantity}`).join('+');
      const primary = personal[0].pack;
      const grantNotes = idempotencyKey ?? notes ?? `Merged personal packs: ${codes}`;

      const credit = await this.creditModel.create({
        studioId: new Types.ObjectId(studioId),
        packId: primary._id,
        packCode: `cart_${totalMappings}`,
        packName: `${totalMappings}-photo pack`,
        maxMappings: totalMappings,
        scanLimit: SCANS_PER_MAPPING,
        totalCredits: totalMappings,
        remainingCredits: totalMappings,
        creditUnit: 'mapping',
        unitPriceInr: totalPriceInr,
        totalPriceInr,
        assignedBy: performedBy ? new Types.ObjectId(performedBy) : null,
        notes: grantNotes,
        isActive: true,
      });

      await this.ledgerModel.create({
        studioId: credit.studioId,
        packId: primary._id,
        creditId: credit._id,
        albumId: null,
        packCode: credit.packCode,
        packName: credit.packName,
        action: PackLedgerAction.PURCHASE,
        quantity: totalMappings,
        unitPriceInr: totalPriceInr,
        totalPriceInr,
        performedBy: performedBy ? new Types.ObjectId(performedBy) : null,
        notes: grantNotes,
      });

      results.push(this.serializeCredit(credit));
    }

    for (const row of rest) {
      results.push(
        await this.assignToStudio(
          {
            studioId,
            packId: row.pack._id.toString(),
            quantity: row.quantity,
            notes: idempotencyKey ?? notes ?? undefined,
          },
          performedBy,
        ),
      );
    }

    return results;
  }

  async quoteCart(items: Array<{ packId: string; quantity: number }>) {
    if (!items.length) throw new BadRequestException('Cart is empty');

    let amountInr = 0;
    let totalMappingSlots = 0;
    const lines: Array<{
      packId: string;
      code: string;
      name: string;
      tier: string;
      quantity: number;
      maxMappings: number;
      albumsIncluded: number;
      mappingSlots: number;
      lineTotalInr: number;
    }> = [];

    for (const item of items) {
      const quantity = Math.max(1, Math.floor(item.quantity || 1));
      const pack = await this.packModel.findById(item.packId).exec();
      if (!pack || !pack.isActive) {
        throw new NotFoundException(`Pack not found or inactive: ${item.packId}`);
      }
      const mappingSlots = this.mappingSlotsFromPack(pack, quantity);
      const lineTotalInr = pack.unitPriceInr * quantity;
      amountInr += lineTotalInr;
      totalMappingSlots += mappingSlots;
      lines.push({
        packId: pack._id.toString(),
        code: pack.code,
        name: pack.name,
        tier: pack.tier,
        quantity,
        maxMappings: pack.maxMappings,
        albumsIncluded: pack.albumsIncluded,
        mappingSlots,
        lineTotalInr,
      });
    }

    const personalOnly = lines.every((line) => line.tier === AlbumPackTier.PERSONAL);

    return {
      amountInr,
      totalMappings: totalMappingSlots,
      totalMappingSlots,
      /** @deprecated Albums are unlimited — kept for older clients. */
      totalAlbumCredits: 0,
      mergesPersonalPacks: personalOnly,
      lines,
    };
  }

  async listStudioCredits(studioId: string) {
    await this.normalizeLegacyAlbumCredits(studioId);
    const credits = await this.creditModel
      .find({ studioId: new Types.ObjectId(studioId), isActive: true })
      .sort({ createdAt: -1 })
      .exec();
    return credits.map((credit) => this.serializeCredit(credit));
  }

  async getStudioPackSummary(studioId: string) {
    const credits = await this.listStudioCredits(studioId);
    const quota = await this.getMappingQuota(studioId);

    return {
      grantedMappingSlots: quota.grantedMappingSlots,
      usedMappingSlots: quota.usedMappingSlots,
      remainingMappingSlots: quota.remainingMappingSlots,
      /** @deprecated Use remainingMappingSlots — albums are unlimited. */
      remainingAlbumCredits: quota.remainingMappingSlots,
      totalAssignedCredits: quota.grantedMappingSlots,
      usedCredits: quota.usedMappingSlots,
      credits,
    };
  }

  /**
   * @deprecated Album create no longer consumes credits. Kept for rare callers.
   */
  async consumeCreditForAlbum(_input: {
    studioId: string;
    packCreditId?: string;
    albumId: string;
    performedBy: string;
  }): Promise<never> {
    throw new BadRequestException(
      'Album creation no longer consumes pack credits. Packs unlock photo mappings only.',
    );
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
      /** Photo-mapping slots granted by this purchase. */
      totalCredits: credit.totalCredits,
      /** Same as totalCredits for mapping-unit rows (pool remaining is studio-wide). */
      remainingCredits: credit.totalCredits,
      creditUnit: credit.creditUnit ?? 'mapping',
      unitPriceInr: credit.unitPriceInr,
      totalPriceInr: credit.totalPriceInr,
      assignedBy: credit.assignedBy?.toString() ?? null,
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

  /**
   * One-time: convert album-slot credits → mapping slots (× maxMappings).
   * Heuristic: album-unit rows have totalCredits < maxMappings (e.g. Mini 1×10).
   */
  private async normalizeLegacyAlbumCredits(studioId?: string) {
    const filter: Record<string, unknown> = {
      $or: [{ creditUnit: { $exists: false } }, { creditUnit: 'album' }],
    };
    if (studioId) filter.studioId = new Types.ObjectId(studioId);

    const legacy = await this.creditModel.find(filter).exec();
    for (const credit of legacy) {
      const maxMappings = Math.max(1, credit.maxMappings || 1);
      if (credit.totalCredits < maxMappings) {
        credit.totalCredits *= maxMappings;
        credit.remainingCredits *= maxMappings;
      }
      credit.creditUnit = 'mapping';
      credit.remainingCredits = credit.totalCredits;
      await credit.save();
    }
  }
}
