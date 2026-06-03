import { ConfigService } from '@nestjs/config';
import { JobQueueService } from './job-queue.service';
import { JobLogService } from './job-log.service';
import { LoggerService } from '../../shared/services/logger.service';
import { QUEUE_NAMES } from '../constants/queue.constants';

describe('JobQueueService inline mode', () => {
  it('runs registered handlers when redis is disabled', async () => {
    const jobLogService = {
      create: jest.fn().mockResolvedValue({ _id: { toString: () => 'log-1' } }),
      markActive: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as JobLogService;

    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as LoggerService;

    const configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'queue.enabled') return false;
        if (key === 'queue.retryAttempts') return 3;
        return fallback;
      }),
    } as unknown as ConfigService;

    const queueService = new JobQueueService(configService, jobLogService, logger);
    const handler = jest.fn().mockResolvedValue({ ok: true });

    queueService.registerHandler(QUEUE_NAMES.SCHEDULED, 'test-job', handler);
    queueService.onModuleInit();

    await queueService.addJob(QUEUE_NAMES.SCHEDULED, 'test-job', { foo: 'bar' });

    expect(handler).toHaveBeenCalled();
    expect(jobLogService.markCompleted).toHaveBeenCalled();
  });
});
