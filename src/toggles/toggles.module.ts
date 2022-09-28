import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TogglesService } from './toggles.service';
import { TogglesController } from './toggles.controller';
import { Toggle } from './entities/toggle.entity';
import { ToggleVersion } from './entities/toggle-version.entity';
import { ToggleRule } from './entities/toggle-rule.entity';
import { ToggleGroup } from './entities/toggle-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Toggle, ToggleVersion, ToggleRule, ToggleGroup])],
  controllers: [TogglesController],
  providers: [TogglesService],
  exports: [TogglesService]
})
export class TogglesModule {}
