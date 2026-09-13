import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../decorators';
import { CheckoutService } from './checkout.service';
import { CreateSignupOrderDto, QuoteCartDto, VerifyCheckoutPaymentDto } from './dto/checkout.dto';

@Controller('public/checkout')
export class PublicCheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Public()
  @Get('catalog')
  catalog() {
    return this.checkoutService.catalog();
  }

  @Public()
  @Post('quote')
  quote(@Body() dto: QuoteCartDto) {
    return this.checkoutService.quote(dto);
  }

  @Public()
  @Post('signup/order')
  createSignupOrder(@Body() dto: CreateSignupOrderDto) {
    return this.checkoutService.createSignupOrder(dto);
  }

  @Public()
  @Post('signup/verify')
  verifySignup(@Body() dto: VerifyCheckoutPaymentDto, @Res({ passthrough: true }) res: Response) {
    return this.checkoutService.verifySignupPayment(dto, res);
  }
}
