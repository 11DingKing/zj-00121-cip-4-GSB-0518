import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Line } from '../../line/entities/line.entity';
import { ProgramTemplate } from '../../program-template/entities/program-template.entity';
import { ProgramTemplateVersion } from '../../program-template/entities/program-template-version.entity';
import { Measurement } from './measurement.entity';
import { JobStep } from './job-step.entity';

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
  FAILED = 'failed',
}

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'text',
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({ type: 'int', nullable: true })
  currentStepIndex: number;

  @Column({ type: 'datetime', nullable: true })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  totalDurationSeconds: number;

  @Column({ nullable: true })
  triggeredBy: string;

  @ManyToOne(() => Line)
  line: Line;

  @Column()
  lineId: number;

  @ManyToOne(() => ProgramTemplate)
  programTemplate: ProgramTemplate;

  @Column()
  programTemplateId: number;

  @ManyToOne(() => ProgramTemplateVersion)
  programTemplateVersion: ProgramTemplateVersion;

  @Column()
  programTemplateVersionId: number;

  @OneToMany(() => JobStep, (jobStep) => jobStep.job, { cascade: true })
  jobSteps: JobStep[];

  @OneToMany(() => Measurement, (measurement) => measurement.job, {
    cascade: true,
  })
  measurements: Measurement[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
