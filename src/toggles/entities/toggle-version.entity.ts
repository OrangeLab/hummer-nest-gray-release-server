import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ToggleRule } from './toggle-rule.entity';

@Entity()
export class ToggleVersion {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false, default: '', comment: '备注' })
  description: string;

  @Index('idx_toggle_id', { unique: false })
  @Column({ name: 'toggle_id', type: 'int', unsigned: true, nullable: false, default: 0, comment: '配置ID' })
  toggleId: number;

  @Column({ name: 'rule_id', type: 'int', unsigned: true, nullable: false, default: 0, comment: '规则ID' })
  ruleId: number;

  rule: ToggleRule;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;
}
