import { Test, TestingModule } from '@nestjs/testing';
import { GrayReleasesController } from './gray-releases.controller';
import { GrayReleasesService } from './gray-releases.service';

describe('GrayReleasesController', () => {
  let controller: GrayReleasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrayReleasesController],
      providers: [GrayReleasesService],
    }).compile();

    controller = module.get<GrayReleasesController>(GrayReleasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
