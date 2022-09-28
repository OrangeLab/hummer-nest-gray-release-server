import { ToggleRuleDto } from './toggle-rule.dto';
import { WhiteListDto } from './white-list.dto';
type ToggleGroupParam = {
  key: string;
  value: string;
};

export class ToggleGroupDto {
  name: string;
  rule: ToggleRuleDto;
  whiteList?: WhiteListDto;
  params: ToggleGroupParam[];
}
