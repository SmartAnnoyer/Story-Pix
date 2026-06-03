import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from '../schemas/email-template.schema';
import { NotificationType } from '../../common/enums';
import { extractTemplateVariables } from '../utils/template.util';
import { LoggerService } from '../../shared/services/logger.service';

const DEFAULT_TEMPLATES = [
  {
    key: 'welcome',
    notificationType: NotificationType.WELCOME,
    subject: 'Welcome to Story-pix, {{firstName}}!',
    htmlBody:
      '<h1>Welcome to Story-pix</h1><p>Hi {{firstName}},</p><p>Your studio <strong>{{studioName}}</strong> is ready.</p>',
    textBody: 'Welcome to Story-pix, {{firstName}}! Your studio {{studioName}} is ready.',
  },
  {
    key: 'password_reset',
    notificationType: NotificationType.PASSWORD_RESET,
    subject: 'Reset your Story-pix password',
    htmlBody:
      '<p>Hi {{firstName}},</p><p>Reset your password using this link:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p>',
    textBody: 'Reset your password: {{resetUrl}}',
  },
  {
    key: 'trial_expiry',
    notificationType: NotificationType.TRIAL_EXPIRING,
    subject: 'Your Story-pix trial ends on {{endDate}}',
    htmlBody:
      '<p>Hi {{firstName}},</p><p>Your trial for {{studioName}} ends on {{endDate}}. Upgrade to stay active.</p>',
    textBody: 'Your trial for {{studioName}} ends on {{endDate}}.',
  },
  {
    key: 'subscription_renewal',
    notificationType: NotificationType.SUBSCRIPTION_RENEWED,
    subject: 'Subscription renewed for {{studioName}}',
    htmlBody: '<p>Your {{planName}} subscription for {{studioName}} has been renewed.</p>',
    textBody: 'Your {{planName}} subscription for {{studioName}} has been renewed.',
  },
  {
    key: 'payment_success',
    notificationType: NotificationType.PAYMENT_SUCCESS,
    subject: 'Payment received — ₹{{amount}}',
    htmlBody: '<p>We received your payment of ₹{{amount}} for {{studioName}}.</p>',
    textBody: 'Payment received: ₹{{amount}} for {{studioName}}.',
  },
  {
    key: 'payment_failure',
    notificationType: NotificationType.PAYMENT_FAILED,
    subject: 'Payment failed for {{studioName}}',
    htmlBody: '<p>Your recent payment for {{studioName}} could not be processed. Please retry.</p>',
    textBody: 'Payment failed for {{studioName}}. Please retry.',
  },
  {
    key: 'album_published',
    notificationType: NotificationType.ALBUM_PUBLISHED,
    subject: 'Album published: {{albumName}}',
    htmlBody: '<p>Your album <strong>{{albumName}}</strong> is now published and ready for viewers.</p>',
    textBody: 'Album {{albumName}} is now published.',
  },
];

@Injectable()
export class EmailTemplateSeedService implements OnModuleInit {
  constructor(
    @InjectModel(EmailTemplate.name)
    private readonly templateModel: Model<EmailTemplateDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EmailTemplateSeedService.name);
  }

  async onModuleInit() {
    for (const template of DEFAULT_TEMPLATES) {
      const exists = await this.templateModel.findOne({ key: template.key, isActive: true }).exec();
      if (exists) continue;

      const variables = extractTemplateVariables(
        `${template.subject}${template.htmlBody}${template.textBody}`,
      );

      await this.templateModel.create({
        ...template,
        variables,
        version: 1,
        isActive: true,
      });
    }

    this.logger.log('Default email templates seeded');
  }
}
