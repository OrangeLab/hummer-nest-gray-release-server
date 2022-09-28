import { ToggleGroupDto } from './toggle-group.dto';
import { ToggleInfoDto } from './toggle-info.dto';
import { ToggleRuleDto } from './toggle-rule.dto';
import { WhiteListDto } from './white-list.dto';

export class ToggleVersionDto {
  toggleInfo: ToggleInfoDto;
  whiteList: WhiteListDto;
  rules: ToggleRuleDto[][];
  groups: ToggleGroupDto[];
  appId?: number;
}
