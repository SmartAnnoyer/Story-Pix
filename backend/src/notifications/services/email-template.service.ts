import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from '../schemas/email-template.schema';
import { NotificationType } from '../../common/enums';
import { renderTemplate } from '../utils/template.util';
import { CreateEmailTemplateDto } from '../dto/notifications.dto';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectModel(EmailTemplate.name)
    private readonly templateModel: Model<EmailTemplateDocument>,
  ) {}

  async findAll(activeOnly = true) {
    const filter = activeOnly ? { isActive: true } : {};
    const templates = await this.templateModel.find(filter).sort({ key: 1, version: -1 }).exec();
    return templates.map((template) => this.serialize(template));
  }

  async findByNotificationType(type: NotificationType): Promise<EmailTemplateDocument> {
    const template = await this.templateModel
      .findOne({ notificationType: type, isActive: true })
      .sort({ version: -1 })
      .exec();

    if (!template) throw new NotFoundException(`Email template not found for ${type}`);
    return template;
  }

  async create(dto: CreateEmailTemplateDto) {
    const latest = await this.templateModel
      .findOne({ key: dto.key })
      .sort({ version: -1 })
      .exec();

    const version = (latest?.version ?? 0) + 1;

    if (latest) {
      await this.templateModel.updateMany({ key: dto.key }, { isActive: false }).exec();
    }

    const template = await this.templateModel.create({ ...dto, version, isActive: true });
    return this.serialize(template);
  }

  render(
    template: EmailTemplateDocument,
    variables: Record<string, string | number | boolean | null | undefined>,
  ) {
    return {
      subject: renderTemplate(template.subject, variables, template.variables),
      html: renderTemplate(template.htmlBody, variables, template.variables),
      text: renderTemplate(template.textBody, variables, template.variables),
    };
  }

  serialize(template: EmailTemplateDocument) {
    const doc = template as EmailTemplateDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: template._id.toString(),
      key: template.key,
      notificationType: template.notificationType,
      subject: template.subject,
      htmlBody: template.htmlBody,
      textBody: template.textBody,
      variables: template.variables,
      version: template.version,
      isActive: template.isActive,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
