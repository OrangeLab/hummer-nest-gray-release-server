import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, Query } from '@nestjs/common';
import { GrayReleasesService } from './gray-releases.service';
import { GetConfigDTO } from './dto/get-config.dto';

@Controller('gray-releases')
export class GrayReleasesController {
  constructor(private readonly grayReleasesService: GrayReleasesService) {}

  @Get('/config')
  getConfig(@Query() params: GetConfigDTO) {
    return this.grayReleasesService.getConfig(params);
  }

  @Post('/generateConfig')
  generateConfig(@Body() params: GetConfigDTO) {
    return this.grayReleasesService.getConfig(params);
  }
}
