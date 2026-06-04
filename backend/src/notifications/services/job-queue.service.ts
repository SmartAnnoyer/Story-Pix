import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, JobsOptions, ConnectionOptions } from 'bullmq';
import { QUEUE_NAMES, QueueName } from '../constants/queue.constants';
import { JobLogService } from './job-log.service';
import { ScheduledJobType } from '../../common/enums';
import { LoggerService } from '../../shared/services/logger.service';

type JobHandler = (payload: Record<string, unknown>) => Promise<unknown>;

@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private connectionOptions: ConnectionOptions | null = null;
  private queues = new Map<string, Queue>();
  private workers: Worker[] = [];
  private handlers = new Map<string, JobHandler>();
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobLogService: JobLogService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(JobQueueService.name);
  }

  onModuleInit() {
    this.enabled = this.configService.get<boolean>('queue.enabled', false);

    if (!this.enabled) {
      this.logger.warn('Redis queue disabled — jobs will run inline');
      return;
    }

    const redisUrl = this.configService.get<string>('queue.redisUrl', 'redis://127.0.0.1:6379');
    this.connectionOptions = this.parseRedisUrl(redisUrl);

    Object.values(QUEUE_NAMES).forEach((queueName) => {
      this.queues.set(queueName, new Queue(queueName, { connection: this.connectionOptions! }));
    });

    this.logger.log('BullMQ queues initialized');
  }

  registerHandler(queueName: QueueName, jobName: string, handler: JobHandler) {
    this.handlers.set(`${queueName}:${jobName}`, handler);

    if (!this.enabled || !this.connectionOptions) return;

    const worker = new Worker(
      queueName,
      async (job) => {
        const key = `${queueName}:${job.name}`;
        const jobHandler = this.handlers.get(key);
        if (!jobHandler) {
          throw new Error(`No handler registered for ${key}`);
        }
        return jobHandler(job.data as Record<string, unknown>);
      },
      {
        connection: this.connectionOptions,
        concurrency: 5,
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(`Job failed ${queueName}/${job?.name}: ${error.message}`);
    });

    this.workers.push(worker);
  }

  async addJob(
    queueName: QueueName,
    jobName: string,
    payload: Record<string, unknown>,
    jobType?: ScheduledJobType,
    options?: JobsOptions,
  ) {
    const retryAttempts = this.configService.get<number>('queue.retryAttempts', 3);
    const retryDelayMs = this.configService.get<number>('queue.retryDelayMs', 5000);

    if (!this.enabled) {
      const handler = this.handlers.get(`${queueName}:${jobName}`);
      if (!handler) {
        this.logger.warn(`Inline job skipped — no handler for ${queueName}:${jobName}`);
        return null;
      }

      const jobLog = await this.jobLogService.create({
        queueName,
        jobType,
        payload,
        maxAttempts: retryAttempts,
      });

      try {
        await this.jobLogService.markActive(jobLog._id.toString(), 1);
        const result = await handler({ ...payload, jobLogId: jobLog._id.toString() });
        await this.jobLogService.markCompleted(
          jobLog._id.toString(),
          result as Record<string, unknown> | undefined,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.jobLogService.markFailed(jobLog._id.toString(), message, true);
      }

      return null;
    }

    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not initialized`);

    return queue.add(jobName, payload, {
      attempts: retryAttempts,
      backoff: { type: 'exponential', delay: retryDelayMs },
      removeOnComplete: 100,
      removeOnFail: 100,
      ...options,
    });
  }

  async moveToDeadLetter(
    sourceQueue: QueueName,
    payload: Record<string, unknown>,
    errorMessage: string,
    attempts: number,
  ) {
    await this.jobLogService.create({
      queueName: QUEUE_NAMES.DEAD_LETTER,
      payload: { sourceQueue, payload, errorMessage, attempts },
      maxAttempts: attempts,
    });

    if (!this.enabled) return;

    await this.addJob(QUEUE_NAMES.DEAD_LETTER, 'dead-letter', {
      sourceQueue,
      payload,
      errorMessage,
    });
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }

  private parseRedisUrl(redisUrl: string): ConnectionOptions {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
