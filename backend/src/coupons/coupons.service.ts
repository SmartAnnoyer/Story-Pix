import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { LoggerService } from '../shared/services/logger.service';

export type AppliedCoupon = {
  couponId: string;
  code: string;
  discountPercent: number;
  discountInr: number;
  subtotalInr: number;
  amountInr: number;
};

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CouponsService.name);
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  toResponse(coupon: CouponDocument) {
    return {
      id: coupon._id.toString(),
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      isActive: coupon.isActive,
      usedCount: coupon.usedCount ?? 0,
      maxUses: coupon.maxUses ?? null,
      expiresAt: coupon.expiresAt ?? null,
      note: coupon.note ?? null,
      createdAt: (coupon as CouponDocument & { createdAt?: Date }).createdAt ?? null,
      updatedAt: (coupon as CouponDocument & { updatedAt?: Date }).updatedAt ?? null,
    };
  }

  async findAll() {
    const rows = await this.couponModel.find().sort({ createdAt: -1 }).exec();
    return rows.map((row) => this.toResponse(row));
  }

  async create(dto: CreateCouponDto) {
    const code = this.normalizeCode(dto.code);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequestException('Coupon code must be 3–32 letters, numbers, - or _');
    }

    const existing = await this.couponModel.findOne({ code }).exec();
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const coupon = await this.couponModel.create({
      code,
      discountPercent: dto.discountPercent,
      isActive: dto.isActive ?? true,
      maxUses: dto.maxUses ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      note: dto.note?.trim() || null,
      usedCount: 0,
    });

    this.logger.log(`Coupon created ${code} (${dto.discountPercent}% off)`);
    return this.toResponse(coupon);
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');

    if (dto.discountPercent != null) coupon.discountPercent = dto.discountPercent;
    if (dto.isActive != null) coupon.isActive = dto.isActive;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.expiresAt !== undefined) {
      coupon.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }
    if (dto.note !== undefined) coupon.note = dto.note?.trim() || null;

    await coupon.save();
    return this.toResponse(coupon);
  }

  async setActive(id: string, isActive: boolean) {
    const coupon = await this.couponModel.findByIdAndUpdate(id, { isActive }, { new: true }).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.toResponse(coupon);
  }

  async applyToSubtotal(
    rawCode: string | undefined | null,
    subtotalInr: number,
  ): Promise<AppliedCoupon | null> {
    if (!rawCode?.trim()) return null;
    if (subtotalInr <= 0) {
      throw new BadRequestException('Cart total must be greater than zero to use a coupon');
    }

    const code = this.normalizeCode(rawCode);
    const coupon = await this.couponModel.findOne({ code }).exec();
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code');
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    const discountInr = Math.min(
      subtotalInr,
      Math.round((subtotalInr * coupon.discountPercent) / 100),
    );
    const amountInr = Math.max(0, subtotalInr - discountInr);

    return {
      couponId: coupon._id.toString(),
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountInr,
      subtotalInr,
      amountInr,
    };
  }

  async incrementUsage(couponId: string) {
    await this.couponModel.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } }).exec();
  }
}
