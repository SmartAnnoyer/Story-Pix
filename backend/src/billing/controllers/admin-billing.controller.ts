import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles, RequirePermissions } from '../../decorators';
import { Role } from '../../common/enums';
import { BillingService } from '../services/billing.service';
import { PaymentService } from '../services/payment.service';
import { InvoiceService } from '../services/invoice.service';
import { SubscriptionService } from '../../subscriptions/subscription.service';
import {
  BillingHistoryQueryDto,
  RefundPaymentDto,
  RevenueQueryDto,
} from '../dto/billing.dto';

@Controller('admin/billing')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:billing:read')
export class AdminBillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Get('revenue')
  getRevenue(@Query() query: RevenueQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.paymentService.getRevenueSummary(from, to);
  }

  @Get('payments')
  getPayments(@Query() query: BillingHistoryQueryDto) {
    return this.paymentService.findAll(query.page, query.limit, {
      studioId: query.studioId,
      status: query.paymentStatus,
    });
  }

  @Get('invoices')
  getInvoices(@Query() query: BillingHistoryQueryDto) {
    return this.invoiceService.findAll(query.page, query.limit, query.studioId);
  }

  @Get('subscriptions/history')
  getSubscriptionHistory(@Query() query: BillingHistoryQueryDto) {
    return this.subscriptionService.findAll({
      page: query.page,
      limit: query.limit,
      studioId: query.studioId,
    });
  }

  @Post('payments/:id/refund')
  @RequirePermissions('platform:billing:write')
  refundPayment(@Param('id') id: string, @Body() _dto: RefundPaymentDto) {
    return this.billingService.refundPlaceholder(id);
  }
}
