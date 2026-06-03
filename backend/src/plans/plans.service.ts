import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlanCode } from '../common/enums';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

const DEFAULT_PLANS: Array<Omit<CreatePlanDto, 'code'> & { code: PlanCode; features: string[] }> = [
  {
    name: 'Starter',
    code: PlanCode.STARTER,
    description: 'For small studios getting started with Story-pix',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    maxAlbums: 5,
    maxPhotosPerAlbum: 50,
    maxVideosPerAlbum: 20,
    storageLimitGB: 10,
    monthlyScanLimit: 1000,
    maxUsers: 2,
    features: ['Basic analytics', 'Email support'],
  },
  {
    name: 'Professional',
    code: PlanCode.PROFESSIONAL,
    description: 'For growing studios with higher volume needs',
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    maxAlbums: 50,
    maxPhotosPerAlbum: 200,
    maxVideosPerAlbum: 100,
    storageLimitGB: 100,
    monthlyScanLimit: 10000,
    maxUsers: 5,
    features: ['Advanced analytics', 'Priority support', 'Custom branding'],
  },
  {
    name: 'Enterprise',
    code: PlanCode.ENTERPRISE,
    description: 'For large studios requiring maximum capacity',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    maxAlbums: -1,
    maxPhotosPerAlbum: 500,
    maxVideosPerAlbum: 500,
    storageLimitGB: 1000,
    monthlyScanLimit: -1,
    maxUsers: -1,
    features: ['Unlimited albums', 'Dedicated support', 'Custom domain', 'SLA'],
  },
];

@Injectable()
export class PlanService implements OnModuleInit {
  constructor(@InjectModel(Plan.name) private readonly planModel: Model<PlanDocument>) {}

  async onModuleInit() {
    await this.seedDefaultPlans();
  }

  async findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    const plans = await this.planModel.find(filter).sort({ monthlyPrice: 1 }).exec();
    return plans.map((plan) => this.serialize(plan));
  }

  async findById(id: string) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return this.serialize(plan);
  }

  async findByCode(code: PlanCode) {
    const plan = await this.planModel.findOne({ code, isActive: true }).exec();
    if (!plan) throw new NotFoundException(`Plan ${code} not found`);
    return plan;
  }

  async findDocumentById(id: string) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const existing = await this.planModel.findOne({ code: dto.code }).exec();
    if (existing) throw new ConflictException('Plan code already exists');

    const plan = await this.planModel.create({ ...dto, features: dto.features ?? [], isActive: true });
    return this.serialize(plan);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');

    Object.assign(plan, dto);
    await plan.save();
    return this.serialize(plan);
  }

  async activate(id: string) {
    return this.setActive(id, true);
  }

  async deactivate(id: string) {
    return this.setActive(id, false);
  }

  isUnlimited(value: number): boolean {
    return value < 0;
  }

  serialize(plan: PlanDocument) {
    const doc = plan as PlanDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: plan._id.toString(),
      name: plan.name,
      code: plan.code,
      description: plan.description ?? null,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      maxAlbums: plan.maxAlbums,
      maxPhotosPerAlbum: plan.maxPhotosPerAlbum,
      maxVideosPerAlbum: plan.maxVideosPerAlbum,
      storageLimitGB: plan.storageLimitGB,
      monthlyScanLimit: plan.monthlyScanLimit,
      maxUsers: plan.maxUsers,
      features: plan.features,
      isActive: plan.isActive,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private async setActive(id: string, isActive: boolean) {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException('Plan not found');
    plan.isActive = isActive;
    await plan.save();
    return this.serialize(plan);
  }

  private async seedDefaultPlans() {
    for (const plan of DEFAULT_PLANS) {
      await this.planModel.updateOne({ code: plan.code }, { $setOnInsert: { ...plan, isActive: true } }, { upsert: true });
    }
  }
}
