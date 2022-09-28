import { Test, TestingModule } from '@nestjs/testing';
import { TogglesService } from './toggles.service';

describe('TogglesService', () => {
  let service: TogglesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TogglesService],
    }).compile();

    service = module.get<TogglesService>(TogglesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
