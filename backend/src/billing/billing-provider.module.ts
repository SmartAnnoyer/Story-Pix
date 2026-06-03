import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BILLING_PROVIDER } from './interfaces/billing-provider.interface';
import { ManualBillingProvider } from './providers/manual-billing.provider';
import { RazorpayBillingProvider } from './providers/razorpay-billing.provider';
import { LoggerService } from '../shared/services/logger.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: BILLING_PROVIDER,
      useFactory: (configService: ConfigService, logger: LoggerService) => {
        const provider = configService.get<string>('billing.provider', 'manual');
        if (provider === 'razorpay') {
          return new RazorpayBillingProvider(configService, logger);
        }
        return new ManualBillingProvider(logger);
      },
      inject: [ConfigService, LoggerService],
    },
  ],
  exports: [BILLING_PROVIDER],
})
export class BillingProviderModule {}
