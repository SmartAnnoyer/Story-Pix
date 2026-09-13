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

  quote(dto: QuoteCartDto) {
    return this.packsService.quoteCart(dto.items);
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

    const quote = await this.packsService.quoteCart(dto.items);
    if (quote.amountInr <= 0) {
      throw new BadRequestException('Invalid cart total');
    }

    const passwordHash = await this.usersService.hashPassword(dto.password);
    const currency = this.configService.get<string>('billing.currency', 'INR');
    const receipt = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const orderResult = await this.billingProvider.createOrder({
      amount: Math.round(quote.amountInr * 100),
      currency,
      receipt,
      notes: {
        kind: CheckoutOrderKind.SIGNUP_PACK,
        email,
      },
    });

    const order = await this.orderModel.create({
      kind: CheckoutOrderKind.SIGNUP_PACK,
      status: CheckoutOrderStatus.PENDING,
      items: dto.items.map((item) => ({
        packId: new Types.ObjectId(item.packId),
        quantity: item.quantity,
      })),
      amountInr: quote.amountInr,
      currency,
      razorpayOrderId: orderResult.orderId,
      email,
      passwordHash,
      passwordPlain: dto.password,
      studioName: dto.studioName?.trim() || null,
      ownerName: dto.ownerName?.trim() || null,
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    });

    this.logger.log(`Signup checkout order ${order._id} → ${orderResult.orderId}`);

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

    if (order.status === CheckoutOrderStatus.FULFILLED && order.email) {
      if (!order.passwordPlain) {
        return {
          alreadyProcessed: true,
          message: 'Account already created — please sign in',
        };
      }
      const session = await this.authService.login(
        { email: order.email, password: order.passwordPlain },
        res,
      );
      order.passwordPlain = null;
      await order.save();
      return { ...session, alreadyProcessed: true };
    }

    if (!order.email || !order.passwordPlain) {
      throw new BadRequestException('Signup order is missing credentials');
    }

    order.razorpayPaymentId = dto.razorpayPaymentId;
    order.status = CheckoutOrderStatus.PAID;
    await order.save();

    const created = await this.studiosService.createFromPaidSignup({
      email: order.email,
      password: order.passwordPlain,
      studioName: order.studioName ?? undefined,
      ownerName: order.ownerName ?? undefined,
    });

    await this.packsService.fulfillCart(
      created.studio.id,
      order.items.map((item) => ({
        packId: item.packId.toString(),
        quantity: item.quantity,
      })),
      created.userId,
      'Signup pack purchase',
    );

    const plain = order.passwordPlain;
    order.status = CheckoutOrderStatus.FULFILLED;
    order.fulfilledAt = new Date();
    order.studioId = new Types.ObjectId(created.studio.id);
    order.userId = new Types.ObjectId(created.userId);
    order.passwordPlain = null;
    order.passwordHash = null;
    await order.save();

    const session = await this.authService.login({ email: order.email, password: plain }, res);

    return {
      ...session,
      alreadyProcessed: false,
      studio: created.studio,
    };
  }

  async createRechargeOrder(studioId: string, userId: string, dto: CreateRechargeOrderDto) {
    const quote = await this.packsService.quoteCart(dto.items);
    const currency = this.configService.get<string>('billing.currency', 'INR');
    const receipt = `recharge_${studioId}_${Date.now()}`;

    const orderResult = await this.billingProvider.createOrder({
      studioId,
      amount: Math.round(quote.amountInr * 100),
      currency,
      receipt,
      notes: {
        kind: CheckoutOrderKind.RECHARGE_PACK,
        studioId,
        userId,
      },
    });

    const order = await this.orderModel.create({
      kind: CheckoutOrderKind.RECHARGE_PACK,
      status: CheckoutOrderStatus.PENDING,
      items: dto.items.map((item) => ({
        packId: new Types.ObjectId(item.packId),
        quantity: item.quantity,
      })),
      amountInr: quote.amountInr,
      currency,
      razorpayOrderId: orderResult.orderId,
      studioId: new Types.ObjectId(studioId),
      userId: new Types.ObjectId(userId),
      expiresAt: new Date(Date.now() + ORDER_TTL_MS),
    });

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
