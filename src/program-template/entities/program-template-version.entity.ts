import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { ProgramTemplate } from './program-template.entity';
import { Step } from './step.entity';
import { Job } from '../../job/entities/job.entity';

@Entity()
export class ProgramTemplateVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  versionNumber: number;

  @Column({ type: 'text', nullable: true })
  changeDescription: string;

  @Column({ type: 'boolean', default: false })
  isLocked: boolean;

  @Column({ type: 'int', nullable: true })
  parentVersionId: number;

  @ManyToOne(() => ProgramTemplateVersion, { nullable: true })
  parentVersion: ProgramTemplateVersion;

  @OneToMany(() => ProgramTemplateVersion, (child) => child.parentVersion)
  childVersions: ProgramTemplateVersion[];

  @ManyToOne(() => ProgramTemplate, (template) => template.versions, { onDelete: 'CASCADE' })
  programTemplate: ProgramTemplate;

  @Column()
  programTemplateId: number;

  @OneToMany(() => Step, (step) => step.programTemplateVersion, { cascade: true })
  steps: Step[];

  @OneToMany(() => Job, (job) => job.programTemplateVersion)
  jobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
