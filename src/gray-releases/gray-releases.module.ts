import { Module } from '@nestjs/common';
import { GrayReleasesService } from './gray-releases.service';
import { GrayReleasesController } from './gray-releases.controller';
import { TogglesService } from 'src/toggles/toggles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Toggle } from 'src/toggles/entities/toggle.entity';
import { TogglesModule } from 'src/toggles/toggles.module';


@Module({
  imports: [TogglesModule],
  controllers: [GrayReleasesController],
  providers: [GrayReleasesService]
})
export class GrayReleasesModule {}
