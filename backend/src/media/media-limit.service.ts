import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ForbiddenException } from '@nestjs/common';
import { MediaType } from '../common/enums';
import { LimitValidationService } from '../subscriptions/limit-validation.service';
import { PlanService } from '../plans/plans.service';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { Media, MediaDocument } from './schemas/media.schema';
import { MediaStatus } from '../common/enums';
import { MediaValidationService } from './media-validation.service';

@Injectable()
export class MediaLimitService {
  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    private readonly limitValidationService: LimitValidationService,
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
    private readonly mediaValidationService: MediaValidationService,
  ) {}

  async validateUpload(
    studioId: string,
    albumId: string,
    mediaType: MediaType,
    mimeType: string,
    fileSize: number,
  ) {
    this.mediaValidationService.validateUploadRequest(mediaType, mimeType, fileSize);
    const sizeGB = this.mediaValidationService.bytesToGB(fileSize);
    await this.limitValidationService.checkStorageLimit(studioId, sizeGB);

    const subscription = await this.subscriptionService.assertSubscriptionActive(studioId);
    const plan = subscription.planId as unknown as { maxPhotosPerAlbum: number; maxVideosPerAlbum: number };

    const filter: FilterQuery<MediaDocument> = {
      studioId,
      albumId,
      mediaType,
      deletedAt: null,
      status: { $ne: MediaStatus.DELETED },
    };

    const count = await this.mediaModel.countDocuments(filter).exec();
    const limit =
      mediaType === MediaType.PHOTO ? plan.maxPhotosPerAlbum : plan.maxVideosPerAlbum;

    if (!this.planService.isUnlimited(limit) && count + 1 > limit) {
      throw new ForbiddenException({
        code: 'PLAN_LIMIT_EXCEEDED',
        message: `${mediaType} limit reached for this album`,
        details: { limit, used: count },
      });
    }
  }
}
