import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { JobLogStatus, ScheduledJobType } from '../../common/enums';

export type JobLogDocument = JobLog & Document;

@Schema({ timestamps: true, collection: 'job_logs' })
export class JobLog {
  @Prop({ required: true, trim: true, index: true })
  queueName!: string;

  @Prop({ type: String, enum: ScheduledJobType, index: true })
  jobType?: ScheduledJobType;

  @Prop({ trim: true, index: true })
  bullJobId?: string;

  @Prop({ type: String, enum: JobLogStatus, required: true, index: true })
  status!: JobLogStatus;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: Number, default: 3 })
  maxAttempts!: number;

  @Prop({ trim: true })
  errorMessage?: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  @Prop({ type: Object })
  result?: Record<string, unknown>;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const JobLogSchema = SchemaFactory.createForClass(JobLog);

JobLogSchema.index({ createdAt: -1 });
JobLogSchema.index({ status: 1, createdAt: -1 });
