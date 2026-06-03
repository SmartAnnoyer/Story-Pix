import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { FilterQuery, Model } from 'mongoose';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import { Role, StudioStatus, SubscriptionStatus, UserStatus, DomainEventType } from '../common/enums';
import { LoggerService } from '../shared/services/logger.service';
import { EventBusService } from '../notifications/services/event-bus.service';
import {
  IStorageService,
  STORAGE_SERVICE,
} from '../storage/interfaces/storage.interface';
import { UsersService } from '../users/users.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { UsageService } from '../subscriptions/usage.service';
import { Studio, StudioDocument } from './schemas/studio.schema';
import {
  CreateStudioDto,
  LogoUploadRequestDto,
  UpdateStudioDto,
  UpdateStudioProfileDto,
} from './dto/studio.dto';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!%*?&';

@Injectable()
export class StudiosService {
  constructor(
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    private readonly usersService: UsersService,
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    @Inject(STORAGE_SERVICE) private readonly storageService: IStorageService,
    private readonly eventBus: EventBusService,
  ) {
    this.logger.setContext(StudiosService.name);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<ReturnType<typeof this.serializeStudio>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<StudioDocument> = {
      deletedAt: null,
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { studioName: { $regex: search, $options: 'i' } },
        { ownerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studioCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.studioModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.studioModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((studio) => this.serializeStudio(studio)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  async findById(id: string) {
    const studio = await this.studioModel.findOne({ _id: id, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const adminAccess = await this.getAdminAccess(studio._id.toString());

    return {
      ...this.serializeStudio(studio),
      adminAccess,
    };
  }

  async resetAdminPassword(studioId: string) {
    const studio = await this.studioModel.findOne({ _id: studioId, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await this.usersService.hashPassword(tempPassword);
    const admin = await this.usersService.resetStudioAdminPassword(
      studioId,
      passwordHash,
      tempPassword,
    );

    if (!admin) {
      throw new NotFoundException('Studio admin account not found');
    }

    return {
      email: admin.email,
      temporaryPassword: tempPassword,
      passwordChanged: false,
    };
  }

  private async getAdminAccess(studioId: string) {
    const admin = await this.usersService.findStudioAdminForStudio(studioId);

    if (!admin) {
      return null;
    }

    return {
      email: admin.email,
      temporaryPassword: admin.temporaryPasswordPlain ?? null,
      passwordChanged: !admin.temporaryPasswordPlain,
    };
  }

  async findByIdForTenant(id: string, userStudioId?: string, userRole?: Role) {
    if (userRole !== Role.SUPER_ADMIN && userStudioId !== id) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    return this.findById(id);
  }

  async findByStudioIdForUser(studioId: string) {
    return this.findById(studioId);
  }

  async create(dto: CreateStudioDto) {
    const existingStudio = await this.studioModel
      .findOne({ email: dto.email.toLowerCase(), deletedAt: null })
      .exec();

    if (existingStudio) {
      throw new ConflictException('A studio with this email already exists');
    }

    const existingAdmin = await this.usersService.findByEmail(dto.adminEmail);
    if (existingAdmin) {
      throw new ConflictException('Admin email is already registered');
    }

    const studioCode = await this.generateUniqueStudioCode();
    const tempPassword = this.generateTemporaryPassword();

    const studio = await this.studioModel.create({
      studioCode,
      studioName: dto.studioName,
      ownerName: dto.ownerName,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      address: dto.address,
      website: dto.website,
      status: StudioStatus.TRIAL,
    });

    await this.subscriptionService.createTrialSubscription(studio._id.toString(), dto.email);

    const refreshedStudio = await this.studioModel.findById(studio._id).exec();

    const passwordHash = await this.usersService.hashPassword(tempPassword);

    await this.usersService.createStudioAdmin({
      studioId: studio._id.toString(),
      email: dto.adminEmail,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      passwordHash,
      temporaryPasswordPlain: tempPassword,
    });

    void this.eventBus.publish({
      eventType: DomainEventType.USER_WELCOME,
      studioId: studio._id.toString(),
      recipientEmail: dto.adminEmail,
      metadata: {
        studioName: studio.studioName,
        studioCode: studio.studioCode,
        firstName: dto.adminFirstName,
        temporaryPassword: tempPassword,
      },
    });

    void this.eventBus.publish({
      eventType: DomainEventType.SUBSCRIPTION_TRIAL_STARTED,
      studioId: studio._id.toString(),
      recipientEmail: dto.adminEmail,
      metadata: { studioName: studio.studioName, firstName: dto.adminFirstName },
    });

    return {
      studio: this.serializeStudio(refreshedStudio!),
      admin: {
        email: dto.adminEmail,
        temporaryPassword: tempPassword,
      },
    };
  }

  async update(id: string, dto: UpdateStudioDto) {
    const studio = await this.studioModel.findOne({ _id: id, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    Object.assign(studio, {
      ...(dto.studioName !== undefined && { studioName: dto.studioName }),
      ...(dto.ownerName !== undefined && { ownerName: dto.ownerName }),
      ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.website !== undefined && { website: dto.website }),
      ...(dto.logo !== undefined && { logo: dto.logo }),
      ...(dto.status !== undefined && { status: dto.status }),
    });

    await studio.save();
    return this.serializeStudio(studio);
  }

  async updateProfile(studioId: string, dto: UpdateStudioProfileDto) {
    return this.update(studioId, dto);
  }

  async suspend(id: string) {
    return this.setStatus(id, StudioStatus.SUSPENDED);
  }

  async activate(id: string) {
    const studio = await this.studioModel.findOne({ _id: id, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    studio.status =
      studio.subscriptionStatus === SubscriptionStatus.TRIAL
        ? StudioStatus.TRIAL
        : StudioStatus.ACTIVE;
    await studio.save();

    return this.serializeStudio(studio);
  }

  async softDelete(id: string) {
    const studio = await this.studioModel.findOne({ _id: id, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    studio.deletedAt = new Date();
    studio.status = StudioStatus.SUSPENDED;
    await studio.save();

    return { message: 'Studio deleted successfully' };
  }

  async getUsage(studioId: string) {
    return this.usageService.getUsageSummary(studioId);
  }

  async requestLogoUpload(studioId: string, dto: LogoUploadRequestDto) {
    const studio = await this.studioModel.findOne({ _id: studioId, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    const extension = dto.fileName?.split('.').pop() ?? 'png';
    const key = `tenants/${studioId}/brand/logo.${extension}`;

    const presigned = await this.storageService.getPresignedUploadUrl(key, dto.contentType);

    return presigned;
  }

  async confirmLogo(studioId: string, logoUrl: string) {
    const studio = await this.studioModel.findOne({ _id: studioId, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    studio.logo = logoUrl;
    await studio.save();

    return this.serializeStudio(studio);
  }

  async getDashboardStats() {
    const notDeleted = { deletedAt: null };

    const [
      totalStudios,
      activeStudios,
      suspendedStudios,
      trialStudios,
      expiredStudios,
      usageAgg,
    ] = await Promise.all([
      this.studioModel.countDocuments(notDeleted).exec(),
      this.studioModel.countDocuments({ ...notDeleted, status: StudioStatus.ACTIVE }).exec(),
      this.studioModel.countDocuments({ ...notDeleted, status: StudioStatus.SUSPENDED }).exec(),
      this.studioModel.countDocuments({ ...notDeleted, status: StudioStatus.TRIAL }).exec(),
      this.studioModel.countDocuments({ ...notDeleted, status: StudioStatus.EXPIRED }).exec(),
      this.studioModel
        .aggregate([
          { $match: notDeleted },
          {
            $group: {
              _id: null,
              totalStorageUsedGB: { $sum: '$storageUsedGB' },
              totalMonthlyScans: { $sum: '$monthlyScanUsage' },
            },
          },
        ])
        .exec(),
    ]);

    const usage = usageAgg[0] ?? { totalStorageUsedGB: 0, totalMonthlyScans: 0 };

    return {
      totalStudios,
      activeStudios,
      suspendedStudios,
      trialStudios,
      expiredStudios,
      totalStorageUsedGB: usage.totalStorageUsedGB ?? 0,
      totalMonthlyScans: usage.totalMonthlyScans ?? 0,
      revenuePlaceholder: 0,
      subscriptionSummary: {
        trial: trialStudios,
        active: activeStudios,
        expired: expiredStudios,
        suspended: suspendedStudios,
      },
    };
  }

  serializeStudio(studio: StudioDocument) {
    const doc = studio as StudioDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: studio._id.toString(),
      studioCode: studio.studioCode,
      studioName: studio.studioName,
      ownerName: studio.ownerName,
      email: studio.email,
      phone: studio.phone ?? null,
      address: studio.address ?? null,
      logo: studio.logo ?? null,
      website: studio.website ?? null,
      subscriptionId: studio.subscriptionId ?? null,
      subscriptionStatus: studio.subscriptionStatus,
      planId: studio.planId?.toString() ?? null,
      activeSubscriptionId: studio.activeSubscriptionId?.toString() ?? null,
      storageLimitGB: studio.storageLimitGB,
      storageUsedGB: studio.storageUsedGB,
      monthlyScanLimit: studio.monthlyScanLimit,
      monthlyScanUsage: studio.monthlyScanUsage,
      status: studio.status,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private async setStatus(id: string, status: StudioStatus) {
    const studio = await this.studioModel.findOne({ _id: id, deletedAt: null }).exec();

    if (!studio) {
      throw new NotFoundException('Studio not found');
    }

    studio.status = status;
    await studio.save();

    return this.serializeStudio(studio);
  }

  private async generateUniqueStudioCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `STU-${randomBytes(3).toString('hex').toUpperCase()}`;
      const exists = await this.studioModel.exists({ studioCode: code }).exec();
      if (!exists) return code;
    }

    throw new ConflictException('Unable to generate unique studio code');
  }

  private generateTemporaryPassword(): string {
    let password = 'Aa1!';
    while (password.length < 12) {
      password += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
    }
    return password;
  }

  private percent(used: number, limit: number): number {
    if (!limit) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }
}
