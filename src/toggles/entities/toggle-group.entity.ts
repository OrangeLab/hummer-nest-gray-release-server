import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ToggleRule } from './toggle-rule.entity';

@Index('uniq_idx_toggle_version_id_name', ['toggleVersionId', 'name'], { unique: true })
@Entity()
export class ToggleGroup {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  // @Column({ name: 'toggle_id', type: 'int', unsigned: true, nullable: false, comment: '配置ID' })
  // toggleId: number;

  @Column({
    name: 'toggle_version_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    default: 0,
    comment: '配置记录ID',
  })
  toggleVersionId: number;

  @Column({ type: 'varchar', length: 45, nullable: false, default: '', comment: '分组名称' })
  name: string;

  @Column({ name: 'rule_id', type: 'int', unsigned: true, nullable: false, default: 0, comment: '规则ID' })
  ruleId: number;

  rule: ToggleRule;

  @Column({ type: 'text', nullable: true, comment: '参数' })
  params: string;

  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, nullable: false, default: 0, comment: '是否删除' })
  isDeleted: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    width: 6,
    default: '1970-01-01 00:00:00',
    nullable: false,
    comment: '删除时间',
  })
  deletedAt: Date;
}
