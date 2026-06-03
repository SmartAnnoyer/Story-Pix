import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobLog, JobLogDocument } from '../schemas/job-log.schema';
import { JobLogStatus, ScheduledJobType } from '../../common/enums';

@Injectable()
export class JobLogService {
  constructor(@InjectModel(JobLog.name) private readonly jobLogModel: Model<JobLogDocument>) {}

  async create(input: {
    queueName: string;
    jobType?: ScheduledJobType;
    bullJobId?: string;
    payload?: Record<string, unknown>;
    maxAttempts?: number;
  }) {
    return this.jobLogModel.create({
      queueName: input.queueName,
      jobType: input.jobType,
      bullJobId: input.bullJobId,
      payload: input.payload,
      status: JobLogStatus.PENDING,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      startedAt: new Date(),
    });
  }

  async markActive(id: string, attempts: number) {
    await this.jobLogModel
      .findByIdAndUpdate(id, { status: JobLogStatus.ACTIVE, attempts })
      .exec();
  }

  async markCompleted(id: string, result?: Record<string, unknown>) {
    await this.jobLogModel
      .findByIdAndUpdate(id, {
        status: JobLogStatus.COMPLETED,
        result,
        completedAt: new Date(),
      })
      .exec();
  }

  async markFailed(id: string, errorMessage: string, deadLetter = false) {
    await this.jobLogModel
      .findByIdAndUpdate(id, {
        status: deadLetter ? JobLogStatus.DEAD_LETTER : JobLogStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      })
      .exec();
  }

  async findAll(page = 1, limit = 20, status?: JobLogStatus) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      this.jobLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.jobLogModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.serialize(item)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findFailed(page = 1, limit = 20) {
    return this.findAll(page, limit, JobLogStatus.FAILED);
  }

  serialize(job: JobLogDocument) {
    const doc = job as JobLogDocument & { createdAt?: Date; updatedAt?: Date };
    return {
      id: job._id.toString(),
      queueName: job.queueName,
      jobType: job.jobType ?? null,
      bullJobId: job.bullJobId ?? null,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      errorMessage: job.errorMessage ?? null,
      payload: job.payload ?? null,
      result: job.result ?? null,
      startedAt: job.startedAt ?? null,
      completedAt: job.completedAt ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
