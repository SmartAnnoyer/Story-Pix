import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../../common/enums';

export interface CreateNotificationInput {
  studioId?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    return this.notificationModel.create({
      studioId: input.studioId ? new Types.ObjectId(input.studioId) : undefined,
      userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: input.channel,
      status: NotificationStatus.PENDING,
      metadata: input.metadata,
    });
  }

  async markSent(id: string) {
    await this.notificationModel
      .findByIdAndUpdate(id, { status: NotificationStatus.SENT })
      .exec();
  }

  async markFailed(id: string) {
    await this.notificationModel
      .findByIdAndUpdate(id, { status: NotificationStatus.FAILED })
      .exec();
  }

  async markRead(id: string, userId: string) {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { status: NotificationStatus.READ, readAt: new Date() },
        { new: true },
      )
      .exec();

    return notification ? this.serialize(notification) : null;
  }

  async findForUser(
    userId: string,
    studioId: string | undefined,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      channel: NotificationChannel.IN_APP,
    };

    if (studioId) {
      filter.studioId = new Types.ObjectId(studioId);
    }

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({
        ...filter,
        status: { $ne: NotificationStatus.READ },
      }).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.serialize(item)),
      unreadCount,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findUnread(userId: string, studioId?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      channel: NotificationChannel.IN_APP,
      status: { $ne: NotificationStatus.READ },
    };

    if (studioId) {
      filter.studioId = new Types.ObjectId(studioId);
    }

    const items = await this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    return items.map((item) => this.serialize(item));
  }

  async findAllAdmin(page = 1, limit = 20, filters?: { status?: string; type?: string }) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (filters?.status) filter.status = filters.status;
    if (filters?.type) filter.type = filters.type;

    const [items, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.serialize(item)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  serialize(notification: NotificationDocument) {
    const doc = notification as NotificationDocument & { createdAt?: Date; updatedAt?: Date };

    return {
      id: notification._id.toString(),
      studioId: notification.studioId?.toString() ?? null,
      userId: notification.userId?.toString() ?? null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      status: notification.status,
      metadata: notification.metadata ?? null,
      readAt: notification.readAt ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
