import { Test, TestingModule } from '@nestjs/testing';
import { AdminStudiosController } from './admin-studios.controller';
import { StudiosService } from '../studios/studios.service';

describe('AdminStudiosController', () => {
  let controller: AdminStudiosController;
  let studiosService: jest.Mocked<StudiosService>;

  beforeEach(async () => {
    studiosService = {
      findAll: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      suspend: jest.fn(),
      activate: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<StudiosService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStudiosController],
      providers: [{ provide: StudiosService, useValue: studiosService }],
    }).compile();

    controller = module.get(AdminStudiosController);
  });

  it('should list studios', async () => {
    studiosService.findAll.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasMore: false },
    });

    const result = await controller.findAll({ page: 1, limit: 20 });
    expect(studiosService.findAll).toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('should suspend studio', async () => {
    studiosService.suspend.mockResolvedValue({ id: '1', status: 'suspended' } as never);
    await controller.suspend('1');
    expect(studiosService.suspend).toHaveBeenCalledWith('1');
  });
});
