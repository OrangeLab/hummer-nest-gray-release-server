import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum ToggleRuleSubject {
  SHOULD = 'should', // 子规则只需要满足一个
  MUST = 'must', // 子规则必须全部满足
  BUCKET = 'bucket',
  WHITE_LIST = 'white_list',
  EXP_BUCKET = 'exp_bucket',
  CLIENT_PARAMETER = 'client_parameter',
}

export enum ToggleRuleOperator {
  EQUAL = 'equal', // 等于
  IN_GROUP = 'inGroup', // 属于
  NOT_EQUAL = 'notEqual', // 不等于
  NOT_IN_GROUP = 'notInGroup', // 不属于
  REGEXP = 'regexp', // 正则
}

export enum ToggleRuleVerb {
  EQUAL = '=', // 等于
  IN_GROUP = '=', // 属于
  NOT_EQUAL = '!=', // 不等于
  NOT_IN_GROUP = '!=', // 不属于
  REGEXP = '~', // 正则
}

export type ToggleRuleValue = ToggleRule | string | number[];

@Entity()
export class ToggleRule {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ name: 'has_child', type: 'tinyint', unsigned: true, nullable: false, default: 0, comment: '是否有子节点' })
  hasChild: number;

  @Column({ name: 'parent_id', type: 'int', unsigned: true, nullable: true, default: 0, comment: '父亲节点ID' })
  parentId: number;

  @Column({ type: 'varchar', length: 45, nullable: false, default: '', comment: '规则类型' })
  subject: ToggleRuleSubject;

  @Column({ type: 'varchar', length: 45, nullable: false, default: '', comment: '运算符' })
  verb: string;

  @Column({ type: 'text', nullable: true, comment: '规则内容' })
  content: string;

  @Column({ type: 'varchar', length: 45, nullable: true, comment: '规则对象，如 phone、uid' })
  noun?: string;

  objects: ToggleRuleValue[];

  @Column({
    name: 'white_list_id',
    type: 'int',
    unsigned: true,
    nullable: true,
    default: 0,
    comment: '白名单，也是一种规则',
  })
  whiteListId: number;

  whiteList: ToggleRule;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间', select: false })
  createdAt: Date;
}
