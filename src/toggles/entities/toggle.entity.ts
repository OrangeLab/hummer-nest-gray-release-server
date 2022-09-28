import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ToggleGroup } from './toggle-group.entity';
import { ToggleRule } from './toggle-rule.entity';
import { ToggleVersion } from './toggle-version.entity';

@Entity()
export class Toggle {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '主键自增ID' })
  id: number;

  @Index('uniq_idx_name', { unique: true })
  @Column({ type: 'varchar', length: 45, nullable: false, default: '', comment: '配置名称' })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false, default: '', comment: '配置描述' })
  description: string;

  @Column({ name: 'app_id', type: 'int', unsigned: true, default: 0, nullable: false, comment: '应用ID' })
  appId: number;

  versionDescription: string;

  rule: ToggleRule;

  groups: ToggleGroup[];

  toggleVersion: ToggleVersion;

  @Column({ name: 'is_deleted', type: 'tinyint', unsigned: true, nullable: false, default: 0, comment: '是否删除' })
  isDeleted: number;

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    nullable: false,
    width: 6,
    default: '1970-01-01 00:00:00',
    comment: '删除时间',
  })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
