import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { ProgramTemplateVersion } from './program-template-version.entity';
import { Line } from '../../line/entities/line.entity';

@Entity()
export class ProgramTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Line)
  line: Line;

  @Column()
  lineId: number;

  @OneToMany(() => ProgramTemplateVersion, (version) => version.programTemplate, { cascade: true })
  versions: ProgramTemplateVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
