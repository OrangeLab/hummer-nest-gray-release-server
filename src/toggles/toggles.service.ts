import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, QueryFailedError } from 'typeorm';
import { isArray } from 'lodash';
import { CreateToggleDto } from './dto/create-toggle.dto';
import { ToggleRuleDto } from './dto/toggle-rule.dto';
import { ToggleVersionDto } from './dto/toggle-version.dto';
import { WhiteListDto } from './dto/white-list.dto';
import { ToggleRule, ToggleRuleSubject, ToggleRuleVerb } from './entities/toggle-rule.entity';
import { Toggle } from './entities/toggle.entity';
import { ToggleVersion } from './entities/toggle-version.entity';
import { ToggleGroup } from './entities/toggle-group.entity';
import { ToggleGroupDto } from './dto/toggle-group.dto';

@Injectable()
export class TogglesService {
  constructor(
    @InjectRepository(Toggle)
    private TogglesRepository: Repository<Toggle>,
    @InjectRepository(ToggleVersion)
    private ToggleVersionsRepository: Repository<ToggleVersion>,
    @InjectRepository(ToggleRule)
    private ToggleRulesRepository: Repository<ToggleRule>,
    @InjectRepository(ToggleGroup)
    private ToggleGroupsRepository: Repository<ToggleGroup>,
  ) { }

  async createToggle(toggleVersionDto: ToggleVersionDto) {
    let toggleName = '';
    let toggleId: number;
    await this.TogglesRepository.manager.transaction(async t => {
      const { toggleInfo, whiteList, groups, rules, appId } = toggleVersionDto;
      if (await this.checkToggleIsExists(toggleInfo.name)) {
        throw new BadRequestException('开关已存在');
      }
      const toggle = this.TogglesRepository.create({
        name: toggleInfo.name,
        appId,
        description: toggleInfo.description
      });
      await t.save(toggle);
      toggleName = toggle.name;
      toggleId = toggle.id
      const rule = await this.transformRule(t, rules, whiteList);
      const toggleVersion = this.ToggleVersionsRepository.create({
        toggleId: toggle.id,
        description: toggleInfo.versionDescription,
        ruleId: rule.id,
      });
      await t.save(toggleVersion);
      for (const groupData of groups) {
        const group = new ToggleGroup();
        const groupRule = await this.transformRule(t, groupData.rule, groupData.whiteList);
        group.ruleId = groupRule.id;
        group.toggleVersionId = toggleVersion.id;
        group.name = groupData.name;
        const params = {};
        for (const { key, value } of groupData.params) {
          params[key] = value;
        }
        group.params = JSON.stringify(params);
        await t.save(group);
      }
    });

    return {
      toggleName,
      toggleId,
      type: 1 // 1新建开关 2修改
    }
  }

  /**
   * 检查开关是否存在
   * @param name 配置名称
   * @returns 存在返回 true，不存在返回 false
   */
  async checkToggleIsExists(name: string): Promise<boolean> {
    const count = await this.TogglesRepository.countBy({ name });
    return count >= 1;
  }

  async transformRule(t: EntityManager, ruleData: ToggleRuleDto[][] | ToggleRuleDto, whiteListData: WhiteListDto) {
    const whiteList = await this.getWhiteListEntity(t, whiteListData);
    const extra: Partial<ToggleRule> = {};
    if (whiteList) extra.whiteListId = whiteList.id;
    let rule: ToggleRule;
    if (isArray(ruleData)) {
      rule = await this.getToggleRuleEntityByNestedToggleRuleDto(t, ruleData, extra);
    } else {
      rule = await this.getToggleRuleEntity(t, ruleData, extra);
    }
    return rule;
  }

  /**
 * 将白名单DTO转换成实体
 * @param whiteListDto 白名单DTO
 * @returns 白名单实体
 */
  async getWhiteListEntity(t: EntityManager, whiteListDto: WhiteListDto): Promise<ToggleRule> {
    if (!whiteListDto) return null;
    const whiteList = this.ToggleRulesRepository.create({
      subject: ToggleRuleSubject.WHITE_LIST,
      verb: ToggleRuleVerb.EQUAL,
      noun: whiteListDto.key,
      content: JSON.stringify(whiteListDto.value),
    });
    await t.save(whiteList);
    return whiteList;
  }

  async getToggleRuleEntityByNestedToggleRuleDto(
    t: EntityManager,
    ruleData: ToggleRuleDto[][],
    extra: Partial<ToggleRule>,
  ) {
    const shouldRule = this.ToggleRulesRepository.create({
      subject: ToggleRuleSubject.SHOULD,
      verb: ToggleRuleVerb.EQUAL,
      hasChild: 1,
    });
    for (const key in extra) {
      shouldRule[key] = extra[key];
    }
    await t.save(shouldRule);
    for (const rules of ruleData) {
      const mustRule = this.ToggleRulesRepository.create({
        subject: ToggleRuleSubject.MUST,
        verb: ToggleRuleVerb.EQUAL,
        hasChild: 1,
        parentId: shouldRule.id,
      });
      await t.save(mustRule);
      for (const subRuleData of rules) {
        await this.getToggleRuleEntity(t, subRuleData, { parentId: mustRule.id });
      }
    }

    return shouldRule;
  }

  /**
  * 将规则DTO转换成规则实体
  * @param ruleDto 规则DTO
  * @returns 规则实体
  */
  async getToggleRuleEntity(t: EntityManager, ruleDto: ToggleRuleDto, extra: Partial<ToggleRule>): Promise<ToggleRule> {
    if (ruleDto.key === 'rule') {
      return await this.getToggleRuleEntityByNestedToggleRuleDto(t, ruleDto.value as ToggleRuleDto[][], extra);
    }
    const rule = this.ToggleRulesRepository.create({
      verb: ruleDto.operator,
      content: JSON.stringify(ruleDto.value),
      noun: ruleDto.key,
    });
    switch (ruleDto.key) {
      case 'bucket':
        rule.subject = ToggleRuleSubject.BUCKET;
        break;
      case 'exp_bucket':
        rule.subject = ToggleRuleSubject.EXP_BUCKET;
        break;
      default:
        rule.subject = ToggleRuleSubject.CLIENT_PARAMETER;
    }
    for (const key in extra) {
      rule[key] = extra[key];
    }
    await t.save(rule);
    return rule;
  }

  async getToggle(toggleName: string) {
    const toggleVersionDto = new ToggleVersionDto();
    const toggle = await this.getToggleByName(toggleName);
    const { toggleVersion } = toggle;
    toggleVersionDto.toggleInfo = {
      name: toggleName,
      description: toggle.description,
      versionDescription: toggleVersion.description,
    };
    toggleVersion.rule = await this.getToggleRuleById(toggleVersion.ruleId);
    toggleVersionDto.whiteList = this.getWhiteListDto(toggleVersion.rule.whiteList);
    toggleVersionDto.rules = this.getToggleRulesDto(toggleVersion.rule);
    toggleVersionDto.groups = await this.getBatchGroupDto(toggleVersion.id);
    return toggleVersionDto;
  }

  async getToggleByName(toggleName: string) {
    const toggle = await this.TogglesRepository
      .createQueryBuilder('toggle')
      .leftJoinAndMapOne('toggle.toggleVersion', ToggleVersion, 'version', 'version.toggleId = toggle.id')
      .where('toggle.name = :toggleName', { toggleName })
      .andWhere('toggle.isDeleted = :isDeleted', { isDeleted: 0 })
      .select(['toggle.id', 'toggle.name', 'toggle.description'])
      .addSelect(['version.id', 'version.description', 'version.ruleId'])
      .orderBy({ 'version.id': 'DESC' })
      .getOne();
    if (!toggle) throw new NotFoundException();
    return toggle;
  }

  async getToggleRuleById(ruleId: number) {
    return this.ToggleRulesRepository
      .createQueryBuilder('rule')
      .leftJoinAndMapOne('rule.whiteList', ToggleRule, 'whiteList', 'whiteList.id = rule.whiteListId')
      .where('rule.id = :ruleId', { ruleId })
      .select(['rule.id', 'rule.subject', 'rule.verb', 'rule.noun', 'rule.content'])
      .addSelect(['whiteList.id', 'whiteList.subject', 'whiteList.verb', 'whiteList.noun', 'whiteList.content'])
      .getOne()
      .then(async rule => {
        if (rule.whiteList) {
          rule.whiteList.objects = JSON.parse(rule.whiteList.content);
          delete rule.whiteList.content;
        }
        if (rule.content) {
          rule.objects = JSON.parse(rule.content);
        } else {
          rule.objects = await this.getRuleObjects(rule.id);
        }
        return rule;
      });
  }

  /**
 * 根据传入的规则ID递归查询全部的子孙规则
 * @param ruleId 规则ID
 * @returns 全部的子孙规则
 */
  async getRuleObjects(ruleId: number): Promise<ToggleRule[]> {
    return this.ToggleRulesRepository
      .createQueryBuilder('rule')
      .leftJoinAndMapOne('rule.whiteList', ToggleRule, 'whiteList', 'whiteList.id = rule.whiteListId')
      .where('rule.parentId = :parentId', { parentId: ruleId })
      .select(['rule.id', 'rule.subject', 'rule.verb', 'rule.noun', 'rule.content'])
      .addSelect(['whiteList.id', 'whiteList.subject', 'whiteList.verb', 'whiteList.noun', 'whiteList.content'])
      .getMany()
      .then(rules =>
        Promise.all(
          rules.map(async rule => {
            if (rule.whiteList) {
              rule.whiteList.content = JSON.parse(rule.whiteList.content);
            }
            if (rule.content) {
              rule.objects = JSON.parse(rule.content);
              delete rule.content;
            } else {
              rule.objects = await this.getRuleObjects(rule.id);
            }
            return rule;
          }),
        ),
      );
  }

  /**
* 将白名单实体转换成对应的DTO
* @param whiteList 白名单实体
* @returns 白名单DTO
*/
  getWhiteListDto(whiteList: ToggleRule): WhiteListDto {
    if (!whiteList) return null;
    const { noun, objects } = whiteList;
    const whiteListDto = new WhiteListDto();
    whiteListDto.key = noun;
    whiteListDto.value = objects as string[];
    return whiteListDto;
  }

  /**
 * 将规则实体转换成对应的DTO
 * @param rule 规则实体
 * @returns 规则DTO列表
 */
  getToggleRulesDto(rule: ToggleRule): ToggleRuleDto[][] {
    const shouldRules: ToggleRuleDto[][] = [];
    const shouldObjects = rule.objects as ToggleRule[];
    for (const mustRule of shouldObjects) {
      const mustObjects = mustRule.objects as ToggleRule[];
      const mustRules: ToggleRuleDto[] = [];
      for (const subRule of mustObjects) {
        mustRules.push(this.getToggleRuleDto(subRule));
      }
      shouldRules.push(mustRules);
    }
    return shouldRules;
  }

  getToggleRuleDto(rule: ToggleRule): ToggleRuleDto {
    if (rule.subject === 'should') {
      return {
        key: 'rule',
        operator: rule.verb,
        value: this.getToggleRulesDto(rule),
      };
    }
    const toggleRuleDto = new ToggleRuleDto();
    toggleRuleDto.key = rule.noun;
    toggleRuleDto.operator = rule.verb;
    toggleRuleDto.value = rule.objects as string[];
    return toggleRuleDto;
  }

  async getGroupDto(toggleVersionId: number, groupName: string): Promise<ToggleGroupDto> {
    const group = await this.getGroupByName(toggleVersionId, groupName);
    if (!group) throw new NotFoundException();
    group.rule = await this.getToggleRuleById(group.ruleId);
    const toggleGroupData = new ToggleGroupDto();
    toggleGroupData.name = group.name;
    toggleGroupData.params = [];
    const params = JSON.parse(group.params);
    for (const key in params) {
      toggleGroupData.params.push({
        key,
        value: params[key],
      });
    }
    if (!group.rule) return toggleGroupData;
    if (group.rule.whiteList) {
      const { noun, objects } = group.rule.whiteList;
      const whiteList = new WhiteListDto();
      whiteList.key = noun;
      whiteList.value = objects as string[];
      toggleGroupData.whiteList = whiteList;
    }
    toggleGroupData.rule = this.getToggleRuleDto(group.rule);
    return toggleGroupData;
  }

  async getBatchGroupDto(toggleVersionId: number): Promise<ToggleGroupDto[]> {
    return this.ToggleGroupsRepository
      .find({ where: { toggleVersionId, isDeleted: 0 }, order: { id: 'ASC' } })
      .then(groups => Promise.all(groups.map(group => this.getGroupDto(toggleVersionId, group.name))));
  }

  async getGroupByName(toggleVersionId: number, groupName: string) {
    const group = await this.ToggleGroupsRepository.findOneBy({
      toggleVersionId,
      name: groupName,
      isDeleted: 0,
    });
    return group;
  }

  /**
 * 根据开关ID和开关版本ID获取全部的分组信息
 * @param toggleVersionId 开关版本ID
 * @returns 分组信息
 */
  async getGroups(toggleVersionId: number) {
    return this.ToggleGroupsRepository.find({
      where: { toggleVersionId, isDeleted: 0 },
      select: ['ruleId', 'name', 'params'],
      order: { id: 'ASC' },
    });
  }

  /**
 * 由分组对象生成分组实体
 * @param toggleId 开关ID
 * @param toggleVersionId 开关版本ID
 * @param groupData 分组对象
 * @returns 返回分组实体
 */
  transformGroup(toggleVersionId: number, groupData: ToggleGroupDto) {
    const group = this.ToggleGroupsRepository.create({
      toggleVersionId,
      name: groupData.name,
    });
    const params = {};
    for (const { key, value } of groupData.params) {
      params[key] = value;
    }
    group.params = JSON.stringify(params);
    return group;
  }

  async addGroup(toggle: Toggle, toggleGroupDto: ToggleGroupDto) {
    const { toggleVersion: curVersion } = toggle;
    const group = await this.getGroupByName(curVersion.id, toggleGroupDto.name);
    if (group) throw new BadRequestException('分组已存在');
    const groups = await this.getGroups(curVersion.id);
    await this.ToggleGroupsRepository.manager.transaction(async t => {
      const newVersion = new ToggleVersion();
      newVersion.toggleId = toggle.id;
      newVersion.description = curVersion.description;
      newVersion.ruleId = curVersion.ruleId;
      await t.save(newVersion);
      const group = this.transformGroup(newVersion.id, toggleGroupDto);
      const rule = await this.transformRule(t, toggleGroupDto.rule, toggleGroupDto.whiteList);
      group.ruleId = rule.id;
      await t.save(group);
      for (const group of groups) {
        const newGroup = new ToggleGroup();
        newGroup.name = group.name;
        newGroup.toggleVersionId = newVersion.id;
        newGroup.ruleId = group.ruleId;
        newGroup.params = group.params;
        await t.save(newGroup);
      }
    });
    return {
      toggleName: toggle.name,
      toggleId: toggle.id,
      type: 1 // 1新建开关 2修改
    }
  }

  async updateGroup(toggle: Toggle, groupName: string, toggleGroupDto: ToggleGroupDto) {
    const { toggleVersion: curVersion } = toggle;
    const group = await this.getGroupByName(curVersion.id, groupName);
    if (!group) throw new NotFoundException();
    const groups = await this.getGroups(curVersion.id);
    await this.ToggleGroupsRepository.manager
      .transaction(async t => {
        const newVersion = new ToggleVersion();
        newVersion.toggleId = toggle.id;
        newVersion.description = curVersion.description;
        newVersion.ruleId = curVersion.ruleId;
        await t.save(newVersion);
        for (const group of groups) {
          if (group.name === groupName) {
            const newGroup = this.transformGroup(newVersion.id, toggleGroupDto);
            const rule = await this.transformRule(t, toggleGroupDto.rule, toggleGroupDto.whiteList);
            newGroup.ruleId = rule.id;
            await t.save(newGroup);
            continue;
          }
          const newGroup = new ToggleGroup();
          newGroup.name = group.name;
          newGroup.toggleVersionId = newVersion.id;
          newGroup.ruleId = group.ruleId;
          newGroup.params = group.params;
          await t.save(newGroup);
        }
      })
      .catch((err: QueryFailedError) => {
        throw new BadRequestException(err.message);
      });

      return {
        toggleName: toggle.name,
        toggleId: toggle.id,
        type: 2 // 1新建开关 2修改
      }
  }

  /**
 * 根据配置ID返回配置的详细信息
 * @param toggleId 配置ID
 * @returns 返回配置详情
 */
  async generateToggle(toggleName: string, groupName?: string): Promise<Toggle> {
    const toggle = await this.getToggleByName(toggleName);

    const toggleVersion = await this.ToggleVersionsRepository.findOne(
      {
        where: {
          toggleId: toggle.id
        },
        order: {
          id: 'DESC'
        },
        select: ['id', 'description', 'ruleId']
      }
    );
    toggle.rule = await this.getToggleRuleById(toggleVersion.ruleId);
    let groups: ToggleGroup[];
    if (groupName) {
      const group = await this.getGroupByName(toggleVersion.id, groupName);
      groups = [group];
    } else {
      groups = await this.getGroups(toggleVersion.id);
    }
    toggle.versionDescription = toggleVersion.description;
    toggle.groups = await Promise.all(
      groups.map(async group => {
        const rule = await this.getToggleRuleById(group.ruleId);
        group.rule = rule;
        if (group.params) {
          try {
            group.params = JSON.parse(group.params);
          } catch (error) {
            group.params = group.params;
          }
        }
        return group;
      }),
    );
    return toggle;
  }
}


