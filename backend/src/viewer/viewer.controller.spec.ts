import { Test, TestingModule } from '@nestjs/testing';
import { ViewerController } from './viewer.controller';
import { ViewerService } from './viewer.service';
import { ScanEventType } from '../common/enums';

describe('ViewerController', () => {
  let controller: ViewerController;
  let viewerService: jest.Mocked<ViewerService>;

  beforeEach(async () => {
    viewerService = {
      getPublicManifest: jest.fn(),
      recordEvent: jest.fn(),
    } as unknown as jest.Mocked<ViewerService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViewerController],
      providers: [{ provide: ViewerService, useValue: viewerService }],
    }).compile();

    controller = module.get(ViewerController);
  });

  it('returns public manifest', async () => {
    viewerService.getPublicManifest.mockResolvedValue({ album: { slug: 'demo' }, targets: [] } as never);

    await controller.getManifest('demo');

    expect(viewerService.getPublicManifest).toHaveBeenCalledWith('demo');
  });

  it('records viewer events', async () => {
    viewerService.recordEvent.mockResolvedValue({ id: '1' } as never);

    await controller.recordEvent('demo', { eventType: ScanEventType.VIEWER_OPEN }, {} as never);

    expect(viewerService.recordEvent).toHaveBeenCalled();
  });
});
