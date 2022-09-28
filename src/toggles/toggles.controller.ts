import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Put } from '@nestjs/common';
import { TogglesService } from './toggles.service';
import { CreateToggleDto } from './dto/create-toggle.dto';
import { UpdateToggleDto } from './dto/update-toggle.dto';
import { ToggleVersionDto } from './dto/toggle-version.dto';
import { ToggleGroupDto } from './dto/toggle-group.dto';

@Controller('toggles')
export class TogglesController {
  constructor(private readonly togglesService: TogglesService) {}

  @Post()
  createToggle(@Body(new ValidationPipe()) toggleVersionDto: ToggleVersionDto) {
    return this.togglesService.createToggle(toggleVersionDto)
  }

  @Post(':toggleName/groups')
  async addToggleGroup(
    @Param('toggleName') toggleName: string,
    @Body(new ValidationPipe()) toggleGroupDto: ToggleGroupDto,
  ) {
    const toggle = await this.togglesService.getToggleByName(toggleName);
    return await this.togglesService.addGroup(toggle, toggleGroupDto);
  }

  @Put(':toggleName/groups/:groupName')
  async updateToggleGroup(
    @Param('toggleName') toggleName: string,
    @Param('groupName') groupName: string,
    @Body(new ValidationPipe()) toggleGroupDto: ToggleGroupDto,
  ) {
    const toggle = await this.togglesService.getToggleByName(toggleName);
    return await this.togglesService.updateGroup(toggle, groupName, toggleGroupDto);
  }
}
