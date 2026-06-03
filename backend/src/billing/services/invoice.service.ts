import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { PaymentDocument } from '../schemas/payment.schema';
import { BillingCycle, InvoiceStatus } from '../../common/enums';
import { PlanDocument } from '../../plans/schemas/plan.schema';
import { SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import { StudioDocument } from '../../studios/schemas/studio.schema';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  async createFromPayment(
    payment: PaymentDocument,
    plan: PlanDocument,
    subscription: SubscriptionDocument,
    billingCycle: BillingCycle,
  ): Promise<InvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const taxAmount = 0;
    const totalAmount = payment.amount + taxAmount;

    return this.invoiceModel.create({
      studioId: payment.studioId,
      subscriptionId: payment.subscriptionId,
      paymentId: payment._id,
      invoiceNumber,
      amount: payment.amount,
      taxAmount,
      totalAmount,
      billingCycle,
      issuedDate: new Date(),
      paidDate: new Date(),
      status: InvoiceStatus.PAID,
    });
  }

  async findByStudioId(
    studioId: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: unknown[]; pagination: Record<string, number | boolean> }> {
    const skip = (page - 1) * limit;
    const filter = { studioId: new Types.ObjectId(studioId) };

    const [items, total] = await Promise.all([
      this.invoiceModel.find(filter).sort({ issuedDate: -1 }).skip(skip).limit(limit).exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((invoice) => this.serialize(invoice)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findAll(
    page = 1,
    limit = 20,
    studioId?: string,
  ): Promise<{ items: unknown[]; pagination: Record<string, number | boolean> }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (studioId) {
      filter.studioId = new Types.ObjectId(studioId);
    }

    const [items, total] = await Promise.all([
      this.invoiceModel.find(filter).sort({ issuedDate: -1 }).skip(skip).limit(limit).exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((invoice) => this.serialize(invoice)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findById(id: string, studioId?: string): Promise<InvoiceDocument> {
    const filter: Record<string, unknown> = { _id: new Types.ObjectId(id) };
    if (studioId) {
      filter.studioId = new Types.ObjectId(studioId);
    }

    const invoice = await this.invoiceModel.findOne(filter).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  buildInvoiceHtml(
    invoice: InvoiceDocument,
    studio: StudioDocument,
    plan: PlanDocument,
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
    h1 { margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    .total { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Story-pix Invoice</h1>
  <div class="meta">
    <div>Invoice #: ${invoice.invoiceNumber}</div>
    <div>Studio: ${studio.studioName}</div>
    <div>Issued: ${invoice.issuedDate.toISOString().slice(0, 10)}</div>
    <div>Status: ${invoice.status}</div>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th>Billing Cycle</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${plan.name} Plan</td>
        <td>${invoice.billingCycle}</td>
        <td>${invoice.amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td colspan="2">Tax (reserved for future GST/international taxes)</td>
        <td>${invoice.taxAmount.toFixed(2)}</td>
      </tr>
      <tr class="total">
        <td colspan="2">Total</td>
        <td>${invoice.totalAmount.toFixed(2)} INR</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
  }

  serialize(invoice: InvoiceDocument) {
    const doc = invoice as InvoiceDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: invoice._id.toString(),
      studioId: invoice.studioId.toString(),
      subscriptionId: invoice.subscriptionId.toString(),
      paymentId: invoice.paymentId?.toString() ?? null,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      billingCycle: invoice.billingCycle,
      issuedDate: invoice.issuedDate,
      paidDate: invoice.paidDate ?? null,
      status: invoice.status,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: { $regex: `^${prefix}` },
    });
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
}
