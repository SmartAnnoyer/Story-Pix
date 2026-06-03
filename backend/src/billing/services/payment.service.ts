import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { PaymentStatus } from '../../common/enums';

@Injectable()
export class PaymentService {
  constructor(@InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>) {}

  async findByStudioId(
    studioId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ items: unknown[]; pagination: Record<string, number | boolean> }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { studioId: new Types.ObjectId(studioId) };

    if (status) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ transactionDate: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((payment) => this.serialize(payment)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: { studioId?: string; status?: string },
  ): Promise<{ items: unknown[]; pagination: Record<string, number | boolean> }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (filters?.studioId) {
      filter.studioId = new Types.ObjectId(filters.studioId);
    }
    if (filters?.status) {
      filter.status = filters.status;
    }

    const [items, total] = await Promise.all([
      this.paymentModel.find(filter).sort({ transactionDate: -1 }).skip(skip).limit(limit).exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((payment) => this.serialize(payment)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findByOrderId(orderId: string, studioId?: string): Promise<PaymentDocument | null> {
    const filter: Record<string, unknown> = { razorpayOrderId: orderId };
    if (studioId) {
      filter.studioId = new Types.ObjectId(studioId);
    }
    return this.paymentModel.findOne(filter).exec();
  }

  async findById(id: string): Promise<PaymentDocument | null> {
    return this.paymentModel.findById(id).exec();
  }

  async getRevenueSummary(from?: Date, to?: Date) {
    const match: Record<string, unknown> = { status: PaymentStatus.PAID };

    if (from || to) {
      match.transactionDate = {};
      if (from) (match.transactionDate as Record<string, Date>).$gte = from;
      if (to) (match.transactionDate as Record<string, Date>).$lte = to;
    }

    const [summary] = await this.paymentModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            paymentCount: { $sum: 1 },
          },
        },
      ])
      .exec();

    const monthly = await this.paymentModel
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: '$transactionDate' },
              month: { $month: '$transactionDate' },
            },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
      .exec();

    return {
      totalRevenue: summary?.totalRevenue ?? 0,
      paymentCount: summary?.paymentCount ?? 0,
      monthlyBreakdown: monthly.map((row) => ({
        year: row._id.year,
        month: row._id.month,
        revenue: row.revenue,
        count: row.count,
      })),
    };
  }

  serialize(payment: PaymentDocument) {
    const doc = payment as PaymentDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: payment._id.toString(),
      studioId: payment.studioId.toString(),
      subscriptionId: payment.subscriptionId.toString(),
      planId: payment.planId.toString(),
      razorpayOrderId: payment.razorpayOrderId ?? null,
      razorpayPaymentId: payment.razorpayPaymentId ?? null,
      razorpaySubscriptionId: payment.razorpaySubscriptionId ?? null,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod ?? null,
      status: payment.status,
      transactionDate: payment.transactionDate ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
