import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Response } from 'express';
import { CheckoutOrderKind, CheckoutOrderStatus } from '../common/enums';
import {
  BILLING_PROVIDER,
  IBillingProvider,
} from '../billing/interfaces/billing-provider.interface';
import { PacksService } from '../packs/packs.service';
import { CouponsService } from '../coupons/coupons.service';
import { StudiosService } from '../studios/studios.service';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { LoggerService } from '../shared/services/logger.service';
import { CheckoutOrder, CheckoutOrderDocument } from './schemas/checkout-order.schema';
import {
  CreateRechargeOrderDto,
  CreateSignupOrderDto,
  QuoteCartDto,
  VerifyCheckoutPaymentDto,
} from './dto/checkout.dto';

const ORDER_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(CheckoutOrder.name)
    private readonly orderModel: Model<CheckoutOrderDocument>,
    @Inject(BILLING_PROVIDER) private readonly billingProvider: IBillingProvider,
    private readonly packsService: PacksService,
    private readonly couponsService: CouponsService,
    private readonly studiosService: StudiosService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CheckoutService.name);
  }

  catalog() {
    return this.packsService.findAll(false);
  }

  async quote(dto: QuoteCartDto) {
    const quote = await this.packsService.quoteCart(dto.items);
    const applied = await this.couponsService.applyToSubtotal(dto.couponCode, quote.amountInr);
    if (!applied) {
      return {
        ...quote,
        subtotalInr: quote.amountInr,
        discountInr: 0,
        couponCode: null,
        discountPercent: null,
      };
    }
    return {
      ...quote,
      amountInr: applied.amountInr,
      subtotalInr: applied.subtotalInr,
      discountInr: applied.discountInr,
      couponCode: applied.code,
      discountPercent: applied.discountPercent,
    };
  }

  async createSignupOrder(dto: CreateSignupOrderDto) {
    const email = dto.email.toLowerCase().trim();
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const baseQuote = await this.packsService.quoteCart(dto.items);
    if (baseQuote.amountInr <= 0) {
      throw new BadRequestException('Invalid cart total');
    }

    const applied = await this.couponsService.applyToSubtotal(dto.couponCode, baseQuote.amountInr);
    const amountInr = applied?.amountInr ?? baseQuote.amountInr;
    const subtotalInr = applied?.subtotalInr ?? baseQuote.amountInr;
    const discountInr = applied?.discountInr ?? 0;

    if (amountInr <= 0) {
      throw new BadRequestException('Invalid cart total after coupon');
    }

    const passwordHash = await this.usersService.hashPassword(dto.password);
    const currency = this.configService.get<string>('billing.currency', 'INR');
    const receipt = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const orderResult = await this.billingProvider.createOrder({
      amount: Math.round(amountInr * 100),
      currency,
      receipt,
      notes: {
        kind: CheckoutOrderKind.SIGNUP_PACK,
        email,
        coupon: applied?.code ?? '',
      },
    });

    const order = await this.orderModel.create({
      kind: CheckoutOrderKind.SIGNUP_PACK,
      status: CheckoutOrderStatus.PENDING,
      items: dto.items.map((item) => ({
        packId: new Types.ObjectId(item.packId),
        quantity: item.quantity,
      })),
      amountInr,
      subtotalInr,
      discountInr,
      couponCode: applied?.code ?? null,
      couponId: applied ? new Types.ObjectId(applied.couponId) : null,
      currency,
      razorpayOrderId: orderResult.orderId,
      email,
      passwordHash,
      passwordPlain: dto.password,
      studioName: dto.studioName?.trim() || null,
      ownerName: dto.ownerName?.trim() || null,
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    });

    this.logger.log(
      `Signup checkout order ${order._id} → ${orderResult.orderId} amount=${amountInr}` +
        (applied ? ` coupon=${applied.code}` : ''),
    );

    const quote = {
      ...baseQuote,
      amountInr,
      subtotalInr,
      discountInr,
      couponCode: applied?.code ?? null,
      discountPercent: applied?.discountPercent ?? null,
    };

    return {
      checkoutId: order._id.toString(),
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: orderResult.keyId,
      quote,
      provider: this.configService.get<string>('billing.provider', 'manual'),
    };
  }

  async verifySignupPayment(dto: VerifyCheckoutPaymentDto, res: Response) {
    this.assertSignature(dto);

    const order = await this.orderModel
      .findOne({
        razorpayOrderId: dto.razorpayOrderId,
        kind: CheckoutOrderKind.SIGNUP_PACK,
      })
      .select('+passwordPlain +passwordHash')
      .exec();

    if (!order) throw new NotFoundException('Checkout order not found');
    this.ensureOrderOpen(order);

    const email = (order.email ?? '').toLowerCase().trim();
    if (!email) {
      throw new BadRequestException('Signup order is missing email');
    }

    // Prefer plaintext from this checkout; fall back is not available after fulfill.
    const plain = order.passwordPlain?.trim() || null;

    if (order.status === CheckoutOrderStatus.FULFILLED) {
      if (plain) {
        const session = await this.authService.login({ email, password: plain }, res);
        order.passwordPlain = null;
        await order.save();
        return { ...session, alreadyProcessed: true };
      }
      return {
        alreadyProcessed: true,
        message: 'Account already created — please sign in with the password you chose at checkout',
      };
    }

    if (!plain && !order.passwordHash) {
      throw new BadRequestException('Signup order is missing credentials');
    }

    // If plaintext was lost but hash remains, we can still create/sync the account hash,
    // but login needs plaintext — keep requiring plain for auto-login.
    if (!plain) {
      throw new BadRequestException(
        'Payment recorded but signup session expired — use Forgot password with this email',
      );
    }

    order.razorpayPaymentId = dto.razorpayPaymentId;
    if (order.status !== CheckoutOrderStatus.PAID) {
      order.status = CheckoutOrderStatus.PAID;
    }
    await order.save();

    const created = await this.studiosService.createFromPaidSignup({
      email,
      password: plain,
      passwordHash: order.passwordHash,
      studioName: order.studioName ?? undefined,
      ownerName: order.ownerName ?? undefined,
    });

    // Persist studio/user link before pack grant so retries can resume cleanly.
    order.studioId = new Types.ObjectId(created.studio.id);
    order.userId = new Types.ObjectId(created.userId);
    await order.save();

    const fulfillKey = `checkout:${order._id.toString()}`;
    await this.packsService.fulfillCart(
      created.studio.id,
      order.items.map((item) => ({
        packId: item.packId.toString(),
        quantity: item.quantity,
      })),
      created.userId,
      'Signup pack purchase',
      fulfillKey,
    );

    if (order.couponId) {
      await this.couponsService.incrementUsage(order.couponId.toString());
    }

    order.status = CheckoutOrderStatus.FULFILLED;
    order.fulfilledAt = new Date();
    order.passwordPlain = null;
    // Keep passwordHash until after successful login attempt in case auto-login fails.
    await order.save();

    try {
      const session = await this.authService.login({ email, password: plain }, res);
      order.passwordHash = null;
      await order.save();
      return {
        ...session,
        alreadyProcessed: Boolean(created.alreadyExisted),
        studio: created.studio,
      };
    } catch (error) {
      this.logger.error(
        `Signup paid but auto-login failed for ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Account + packs are ready — customer can sign in manually with checkout password.
      return {
        alreadyProcessed: true,
        message: 'Payment successful — please sign in with the password you chose at checkout',
        studio: created.studio,
        email,
      };
    }
  }

  async createRechargeOrder(studioId: string, userId: string, dto: CreateRechargeOrderDto) {
    const baseQuote = await this.packsService.quoteCart(dto.items);
    if (baseQuote.amountInr <= 0) {
      throw new BadRequestException('Invalid cart total');
    }

    const applied = await this.couponsService.applyToSubtotal(dto.couponCode, baseQuote.amountInr);
    const amountInr = applied?.amountInr ?? baseQuote.amountInr;
    const subtotalInr = applied?.subtotalInr ?? baseQuote.amountInr;
    const discountInr = applied?.discountInr ?? 0;

    if (amountInr <= 0) {
      throw new BadRequestException('Invalid cart total after coupon');
    }

    const currency = this.configService.get<string>('billing.currency', 'INR');
    const receipt = `recharge_${studioId}_${Date.now()}`;

    const orderResult = await this.billingProvider.createOrder({
      studioId,
      amount: Math.round(amountInr * 100),
      currency,
      receipt,
      notes: {
        kind: CheckoutOrderKind.RECHARGE_PACK,
        studioId,
        userId,
        coupon: applied?.code ?? '',
      },
    });

    const order = await this.orderModel.create({
      kind: CheckoutOrderKind.RECHARGE_PACK,
      status: CheckoutOrderStatus.PENDING,
      items: dto.items.map((item) => ({
        packId: new Types.ObjectId(item.packId),
        quantity: item.quantity,
      })),
      amountInr,
      subtotalInr,
      discountInr,
      couponCode: applied?.code ?? null,
      couponId: applied ? new Types.ObjectId(applied.couponId) : null,
      currency,
      razorpayOrderId: orderResult.orderId,
      studioId: new Types.ObjectId(studioId),
      userId: new Types.ObjectId(userId),
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    });

    const quote = {
      ...baseQuote,
      amountInr,
      subtotalInr,
      discountInr,
      couponCode: applied?.code ?? null,
      discountPercent: applied?.discountPercent ?? null,
    };

    return {
      checkoutId: order._id.toString(),
      orderId: orderResult.orderId,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: orderResult.keyId,
      quote,
      provider: this.configService.get<string>('billing.provider', 'manual'),
    };
  }

  async verifyRechargePayment(studioId: string, userId: string, dto: VerifyCheckoutPaymentDto) {
    this.assertSignature(dto);
    const order = await this.orderModel
      .findOne({
        razorpayOrderId: dto.razorpayOrderId,
        kind: CheckoutOrderKind.RECHARGE_PACK,
      })
      .exec();

    if (!order) throw new NotFoundException('Checkout order not found');
    if (order.studioId?.toString() !== studioId) {
      throw new BadRequestException('Checkout order does not belong to this studio');
    }
    this.ensureOrderOpen(order);

    if (order.status === CheckoutOrderStatus.FULFILLED) {
      return {
        alreadyProcessed: true,
        summary: await this.packsService.getStudioPackSummary(studioId),
      };
    }

    order.razorpayPaymentId = dto.razorpayPaymentId;
    order.status = CheckoutOrderStatus.PAID;
    await order.save();

    await this.packsService.fulfillCart(
      studioId,
      order.items.map((item) => ({
        packId: item.packId.toString(),
        quantity: item.quantity,
      })),
      userId,
      'Self-serve pack recharge',
    );

    if (order.couponId) {
      await this.couponsService.incrementUsage(order.couponId.toString());
    }

    order.status = CheckoutOrderStatus.FULFILLED;
    order.fulfilledAt = new Date();
    await order.save();

    return {
      alreadyProcessed: false,
      summary: await this.packsService.getStudioPackSummary(studioId),
    };
  }

  private assertSignature(dto: VerifyCheckoutPaymentDto) {
    const ok = this.billingProvider.verifyPaymentSignature({
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
    });
    if (!ok) throw new BadRequestException('Invalid payment signature');
  }

  private ensureOrderOpen(order: CheckoutOrderDocument) {
    if (order.status === CheckoutOrderStatus.FULFILLED) return;
    if (order.expiresAt.getTime() < Date.now()) {
      order.status = CheckoutOrderStatus.EXPIRED;
      void order.save();
      throw new BadRequestException('Checkout order expired — start again');
    }
    if (order.status !== CheckoutOrderStatus.PENDING && order.status !== CheckoutOrderStatus.PAID) {
      throw new BadRequestException(`Checkout order is ${order.status}`);
    }
  }
}
