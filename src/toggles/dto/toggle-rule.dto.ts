type ToggleRuleValue = string | number[] | ToggleRuleDto[];
export class ToggleRuleDto {
  key: string;
  value: ToggleRuleValue[];
  operator: string;
}
