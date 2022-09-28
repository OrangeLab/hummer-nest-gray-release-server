import * as fs from 'fs'
import * as crypto from 'crypto'
import * as async from 'async'
import _ from 'lodash'
import { CharacterInfo, GetConfigDTO } from 'src/gray-releases/dto/get-config.dto'
interface IRuleParseCharacter {
  [key: string]: any
}

export class ToggleError extends Error {

  public name = 'ToggleError'

  public toggleName: string

  constructor(toggleName: string, message?: string) {
    super(message)
    this.toggleName = toggleName
  }

  public toString() {
    return `${this.name}:[${this.toggleName}]:${this.message || ''}`
  }

}

/**
 * 开关规则
 */
 export interface IToggleRule {
  /**
   * 标记，规则特殊标记
   */
  noun?: string
  /**
   * 分类名称
   */
  subject: string
  /**
   * 符号，例如 "="/"=>"
   */
  verb: string
  /**
   * 计算值
   */
  objects: RuleContentObject[]
}


/**
 * 规则计算对象
 */
 export type RuleContentObject = IRuleObject | string | any

 /**
  * 规则信息
  */
 export interface IRuleObject {
   subject: string
   verb: string
   objects: IRuleObjectsValues[]
 }

 /**
 * 规则值
 */
export interface IRuleObjectsValues {
  subject: string
  noun?: string
  verb: string
  objects: Array<number[] | string>
}

/**
 * 结果分组对象
 */
 export interface IGroupInfo {
  // 结果版本
  version: number
  // 分组名称
  groupName: string
  // 参数
  params: {
    [key: string]: any
  }
}

export interface ToggleContent {
  toggle: IToggle
}

/**
 * 开关信息
 */
export interface IToggle {
  rule: IToggleRule
  experiment?: IExperiment
}

/**
 * 实验信息
 */
 export interface IExperiment {
  groups: IGroup[]
}

export interface IGroup {
  name: string
  params: IParams
  rule: IGroupRule
  white_list?: IGroupRule
}
/**
 * 分组参数
 */
 export interface IParams {
  [key: string]: any
}

/**
 * 分组规则
 */
export interface IGroupRule {
  noun?: string
  subject: string
  verb: string
  objects: number[][]
}


export default class Toggle {
  /**
   * 是否错误
   */
  public error: ToggleError | undefined
  /**
   * 用户命中条件信息
   */
  public characterInfo!: CharacterInfo
  /**
   * 实验结果对象
   */
  public toggleResult!: any

  /**
   * 是否允许进入实验或者灰度
   */
  public get allow() {
    if (this.error) {
      return false
    }
    return this.toggleResult.allow
  }

  /**
   * 获取 toggle 的版本信息
   */
  public get version() {
    if (this.error) {
      return null
    }
    let version = null
    const groupInfo = this.toggleResult.groupInfo
    if (groupInfo) {
      version = groupInfo.version
    }

    return version
  }

  /**
   * 如果允许进入实验，获取实验或灰度所 key 所对应的参数值；如果不存在，则返回为 null
   */
  public value<T = any>(key: string): T | null {
    if (this.error) {
      return null
    }

    let value: T
    const groupInfo = this.toggleResult.groupInfo

    if (groupInfo && groupInfo.params) {
      value = (groupInfo.params as any)[key]
    }
    return value
  }


  /**
   * 如果允许进入实验，获取实验或灰度所有参数对象。如果为空，则返回为空的 object
   */
  public values<T = any>(): Readonly<T> {
    let rs = {}
    if (this.error) {
      return rs as any
    }

    const groupInfo = this.toggleResult.groupInfo
    if (groupInfo && groupInfo.params) {
      rs = groupInfo.params
    }
    // clone 一下值，否则外面如果改变结果的话，会影响到 sdk 内部
    return _.clone(rs) as any
  }
}





/**
 * rule parse 整个解析生命周期里的上下文
 */
interface IRuleParseContext {
  toggleJson: IToggle,
  expJson: any,
  toggleName: string,
  characterInfo: GetConfigDTO['characterInfo'],
}

/**
 * ruleParse 调用的选项
 */
export interface IRuleParseOptions {
  toggleContent: ToggleContent
  characterInfo: GetConfigDTO['characterInfo']
  toggleName: string
}


/**
 * 是否命中实验，回调函数
 */
type AllowHandler = (isAllow: boolean) => void

/**
 * 转换规则
 * @exception 如果解析失败会抛出异常
 * @param opts 
 */
 export function ruleParse(opts: IRuleParseOptions) {
  const content = opts.toggleContent
  const characterInfo = opts.characterInfo
  const toggleName = opts.toggleName

  const toggleJson = content.toggle
  

  if (!toggleJson || !toggleJson.rule) {
    // @TODO 这里异常是否抛出
    throw new Error('Not found rule: ' + toggleName)
  }

  const context: IRuleParseContext = {
    toggleJson,
    expJson: toggleJson.experiment,
    toggleName,
    characterInfo
  }

  return execute(context)
}

/**
 * 解析实验命中规则和返回规则对象
 * @param callback
 */
const execute = (context: IRuleParseContext) => {
  const toggleResult = {
    toggleName: context.toggleName,
  } as any


  
  return new Promise((resolve, reject) => {
    runRule(context, context.toggleJson.rule, context.characterInfo, (isAllow) => {
      toggleResult.allow = isAllow

      if (isAllow && context.expJson) {
        try {
          assignGroup(context, context.characterInfo, (groupInfo) => {

            if (groupInfo) {
              toggleResult.groupInfo = groupInfo
            }

            resolve(toggleResult)
          })
        } catch (error) {
          reject(error)
        }
      } else {
        resolve(toggleResult)
      }
    })
  })
}


/**
 * 分组信息
 * @exception 运行失败抛出 Error
 * @param callback
 */
const assignGroup = (context: IRuleParseContext, characterInfo: CharacterInfo, callback: (groupInfo: IGroupInfo | null) => void) => {
  const groups: IGroup[] = context.expJson.groups
  if (!groups.length) {
    throw new Error('Cannot assign characterInfo to groups')
  }

  let groupInfo: any | null = null

  // 白名单
  groups.forEach((group) => {
    const curInfo = {
      groupName: group.name,
      params: group.params
    }

    const whileListRule = group.white_list
    if (whileListRule) {
      const whileListNoun = whileListRule.noun
      let value = characterInfo[whileListNoun || '']
      const objects = whileListRule.objects
      // @ts-ignore
      if (value && objects && objects.length && objects.indexOf(value) > -1) {
        value += ''
        groupInfo = curInfo
        return false
      }
    }
  })


  if (groupInfo) {
    callback(groupInfo)
    return false
  }
  // 命中规则解析
  groups.forEach((group) => {
    if (groupInfo) {
      // 如果已经找到分组了，不用继续找
      return false
    }

    const curInfo = {
      groupName: group.name,
      params: group.params
    }

    const rule = group.rule
    runRule(context, rule, characterInfo, (isAllow) => {
      if (isAllow) {
        groupInfo = curInfo
      }
    })
  })

  if (!groupInfo) {
    // throw new Error('Cannot assign characterInfo to any group')
    callback(null)
  } else {
    callback(groupInfo)
  }
}

/**
 * 规则转换
 * @private
 * @hidden
 */


/**
 * 运行和解析规则，永远返回 callback，不会抛出异常
 * @param context 配置上下文
 * @param rule 规则
 * @param characterInfo 设备特征
 * @param callback
 */
export const runRule = (context: IRuleParseContext, rule: IToggleRule, characterInfo: IRuleParseCharacter, callback: AllowHandler) => {
  if (!rule.subject || !rule.objects) {
    /**
     * 默认按照没有命中规则处理
     */
    callback(false)
    return
    // throw new Error('Missing subject or objects')
  }

  // 运行配置的不同分类规则
  switch (rule.subject) {
    // 用户自定义
    case 'client_parameter':
      runClientParameter(rule, characterInfo, callback)
      break
    // 白名单
    case 'white_list':
      runClientParameter(rule, characterInfo, callback)
      break
    // 城市
    case 'city':
      rule.noun = 'city'
      runClientParameter(rule, characterInfo, callback)
      break
    // 流量人群必要条件（并且条件）
    case 'must':
      runMust(context, rule, characterInfo, callback)
      break
    // 流量人群条件（或者条件）
    case 'should':
      runShould(context, rule, characterInfo, callback)
      break
    // 分桶
    case 'bucket':
      runBucket(context, rule, characterInfo, 1000, callback)
      break
    //
    case 'exp_bucket':
      runBucket(context, rule, characterInfo, 100, callback)
      break
    // 用户分组
    case 'characterInfo_group':
      runUserGroup(rule, characterInfo, callback)
      break
    default:
      callback(false)
  }
}
/**
 * 自定义规则计算
 * @param rule
 * @param callback
 */
export const runClientParameter = (rule: IToggleRule, characterInfo: IRuleParseCharacter, callback: AllowHandler) => {
  if (!rule.noun) {
    // throw new Error('ClientParameter rule missing noun field')
    callback(false)
    return
  }

  let value = characterInfo[rule.noun]
  const verb = rule.verb
  let ruleRs = false

  /**
   * 解析规则
   */
  if (value) {
    value += ''
    if (!verb || verb === '=') {
      ruleRs = rule.objects.indexOf(value) > -1
    } else if (verb === '!=') {
      ruleRs = rule.objects.indexOf(value) < 0
    } else if (verb === '~') {
      const regexp = new RegExp(rule.objects[0] as string)
      ruleRs = regexp.test(value)
    } else if (verb === '>') {
      ruleRs = value - 0 > rule.objects[0] - 0
    } else if (verb === '<') {
      ruleRs = value - 0 < rule.objects[0] - 0
    } else {
      // @TODO 这里如何抛出异常？
      ruleRs = false
      // throw new Error('verb error: ' + verb)
    }
  }

  callback(ruleRs)
}

/**
 * 分桶规则计算
 * @param rule
 * @param totalBucket
 * @param callback
 */
export const runBucket = (context: IRuleParseContext, rule: IToggleRule, characterInfo: IRuleParseCharacter, totalBucket: number, callback: AllowHandler) => {
  const objects = rule.objects
  if (!objects.push) {
    // throw new Error('bucket range error in rule.')
    callback(false)
    return
  }

  const characterInfoKey = (characterInfo.key + '').trim()
  if (!characterInfoKey) {
    // throw new Error('User has no key when accessing toggle:')
    callback(false)
    return
  }

  const inputSHA1 = characterInfoKey + context.toggleName + rule.subject
  const ShaSum = crypto.createHash('sha1')

  ShaSum.update(inputSHA1)
  const sha1Str = ShaSum.digest('hex')
  const lastSha1Str = sha1Str.substr(-8)
  const bucket = parseInt(lastSha1Str, 16) % totalBucket
  let ruleRs = false

  if (objects.length === 1 && Number.isInteger(objects[0])) {
    ruleRs = bucket < objects[0]
  } else {
    objects.some(function (item) {
      if (!item.push || item.length !== 2) {
        // throw new Error('ucket range error')
        /**
         * 规则格式不正确，直接跳出循环，标记错误
         */
        return true
      }
      /**
       * 只要命中一条正确的规则，则直接返回 true
       */
      if (item[0] <= bucket && bucket < item[1]) {
        ruleRs = true
        return true
      }
    })
  }
  callback(ruleRs)

}

/**
 * 解析 “并且” 的规则
 * @param rule
 * @param callback
 */
export const runMust = (context: IRuleParseContext, rule: IToggleRule, characterInfo: IRuleParseCharacter, callback: AllowHandler) => {
  const objects = rule.objects

  /**
   * @TODO 升级
   */
  async.every(
    objects,
    function (rule: IToggleRule, cb: (arg0: null, arg1: boolean) => void) {
      runRule(context, rule, characterInfo, function (rs) {
        cb(null, rs)
      })
    },
    function (err: any, result: any) {
      if (err) {
        // throw err
        callback(false)
      }
      callback(result)
    }
  )
}

/**
 * 用户并且规则
 * @param rule
 * @param callback
 */
export const runShould = (context: IRuleParseContext, rule: IToggleRule, characterInfo: IRuleParseCharacter, callback: AllowHandler) => {
  const objects = rule.objects

  async.some(
    objects,
    function (rule: IToggleRule, cb: (arg0: null, arg1: boolean) => void) {
      runRule(context, rule, characterInfo, function (rs) {
        cb(null, rs)
      })
    },
    function (err: any, result: any) {
      if (err) {
        // throw err
        callback(false)
        return
      }
      callback(result)
    }
  )
}

export const parseContent = (data: any) => {
  const { rule, groups } = data;
  return {
    toggle: {
      rule,
      experiment: {
        groups
      },
    },
  };
}

/**
 * 用户自定义分组规则
 * @param rule
 * @param callback
 */
 export const runUserGroup = (rule: IToggleRule, characterInfo: IRuleParseCharacter, callback: AllowHandler) => {
  // TODO: 人群分组
  return false
}


/**
* 将灰度开关文件解析出来的 json 对象进行解析，决策试验并得到结果
* @exception 不会抛出异常，但是会使用抛出错误事件
*/
export const matchToggle = async (  
  toggleName: string,
  characterInfo: GetConfigDTO['characterInfo'],
  toggleContent: ToggleContent) => {

  const startTime = Date.now()

  const toggle = new Toggle()

  toggle.characterInfo = characterInfo

  if (!toggleContent.toggle || !toggleContent.toggle.rule) {
    return Promise.resolve(toggle)
  }

  // tslint:disable-next-line: no-unused-expression
  try {
    const toggleResult = await ruleParse({
      toggleContent,
      characterInfo,
      toggleName,
    })
    toggle.toggleResult = toggleResult
    return toggle
  } catch (e) {
    const error = new ToggleError(toggleName, e.message)
    error.stack = e.stack

    toggle.error = error
    return toggle
  }
}
