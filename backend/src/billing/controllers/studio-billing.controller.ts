import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles, RequirePermissions } from '../../decorators';
import { Role } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { BillingService } from '../services/billing.service';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { PlanService } from '../../plans/plans.service';
import { Studio, StudioDocument } from '../../studios/schemas/studio.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from '../../subscriptions/schemas/subscription.schema';
import {
  BillingHistoryQueryDto,
  ChangeBillingPlanDto,
  CreateOrderDto,
  VerifyPaymentDto,
} from '../dto/billing.dto';

@Controller('studio/billing')
@Roles(Role.STUDIO_ADMIN)
export class StudioBillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly planService: PlanService,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  @Get('subscription')
  @RequirePermissions('billing:read')
  getCurrentSubscription(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.getCurrentSubscription(user.studioId);
  }

  @Post('upgrade')
  @RequirePermissions('billing:write')
  upgradePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeBillingPlanDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.upgradePlan(user.studioId, dto, user.userId);
  }

  @Post('downgrade')
  @RequirePermissions('billing:write')
  downgradePlan(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeBillingPlanDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.downgradePlan(user.studioId, dto, user.userId);
  }

  @Post('cancel')
  @RequirePermissions('billing:write')
  cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.cancelSubscription(user.studioId, user.userId);
  }

  @Post('payments/order')
  @RequirePermissions('billing:write')
  createOrder(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.createOrder(user.studioId, dto, user.userId);
  }

  @Post('payments/verify')
  @RequirePermissions('billing:write')
  verifyPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyPaymentDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.billingService.verifyPayment(user.studioId, dto, user.userId);
  }

  @Get('payments')
  @RequirePermissions('billing:read')
  getPaymentHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: BillingHistoryQueryDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.paymentService.findByStudioId(
      user.studioId,
      query.page,
      query.limit,
      query.paymentStatus,
    );
  }

  @Get('invoices')
  @RequirePermissions('billing:read')
  getInvoices(@CurrentUser() user: AuthenticatedUser, @Query() query: BillingHistoryQueryDto) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.invoiceService.findByStudioId(user.studioId, query.page, query.limit);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:read')
  getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.invoiceService.findById(id, user.studioId).then((invoice) =>
      this.invoiceService.serialize(invoice),
    );
  }

  @Get('invoices/:id/download')
  @RequirePermissions('billing:read')
  @Header('Content-Type', 'text/html')
  async downloadInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');

    const invoice = await this.invoiceService.findById(id, user.studioId);
    const studio = await this.studioModel.findById(user.studioId).exec();
    const subscription = await this.subscriptionModel.findById(invoice.subscriptionId).exec();
    const plan = subscription
      ? await this.planService.findDocumentById(subscription.planId.toString())
      : null;

    if (!studio || !plan) {
      throw new ForbiddenException('Unable to generate invoice');
    }

    const html = this.invoiceService.buildInvoiceHtml(invoice, studio, plan);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.html"`,
    );
    return res.send(html);
  }
}
