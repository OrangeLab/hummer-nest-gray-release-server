import { Test, TestingModule } from '@nestjs/testing';
import { TogglesController } from './toggles.controller';
import { TogglesService } from './toggles.service';

describe('TogglesController', () => {
  let controller: TogglesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TogglesController],
      providers: [TogglesService],
    }).compile();

    controller = module.get<TogglesController>(TogglesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
