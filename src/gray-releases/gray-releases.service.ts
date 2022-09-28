import { Injectable } from '@nestjs/common';
import { TogglesService } from 'src/toggles/toggles.service';
import { GetConfigDTO } from './dto/get-config.dto';
import Toggle, { matchToggle, parseContent } from 'src/common/utils/grayRelease';
import { getPublicUrls } from 'src/common/utils/oss';

@Injectable()
export class GrayReleasesService {
  constructor(
    private togglesService: TogglesService,
  ) { }


  async getConfig(params: GetConfigDTO) {
    // 拼装 toggleName
    const nativeVersion = params.nativeVersion.replace(/\./g, '_')
    const platform = String.prototype.toLowerCase.call(params.platform)
    // 拼接开关名称
    const toggleName = `hummer_${params.appId}_${platform}_${nativeVersion}`
    const characterInfo = params.characterInfo

    // TODO:这里开关信息可以用cache 理论上可以提升速度
    const toggle = await this.togglesService.generateToggle(toggleName)
    const toggleContent = toggle ? parseContent(toggle) : { toggle: null }
    // content为空时返回空
    const res =  await matchToggle(toggleName, characterInfo, toggleContent)

    return this.genConfig(toggleName, res)
  }

  async genConfig(key: string, toggle: Toggle) {
    const configStr = toggle.allow ? toggle.value('config') : null
    if (!configStr) {
      return null
    }
    const config = JSON.parse(configStr)
    const keys = config.modules.map(module => module.key as string)
    const urls = getPublicUrls(keys)
    urls.forEach((url, idx) => {
      config.modules[idx].url = url
      config.modules[idx].lazy_download = config.modules[idx].lazy_download || 0
    })
    return config
  }
}

