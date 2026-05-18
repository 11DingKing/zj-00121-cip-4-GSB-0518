import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Job } from './job.entity';
import { StepType, FailureStrategy } from '../../program-template/entities/step.entity';

export enum JobStepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity()
export class JobStep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'text',
  })
  type: StepType;

  @Column({ type: 'int' })
  order: number;

  @Column({
    type: 'text',
    default: JobStepStatus.PENDING,
  })
  status: JobStepStatus;

  @Column({ type: 'float' })
  targetTemperature: number;

  @Column({ type: 'float' })
  temperatureTolerance: number;

  @Column({ type: 'float' })
  targetFlowRate: number;

  @Column({ type: 'float' })
  flowRateTolerance: number;

  @Column({ type: 'float' })
  targetConductivity: number;

  @Column({ type: 'float' })
  conductivityTolerance: number;

  @Column({ type: 'int' })
  holdTimeSeconds: number;

  @Column({ type: 'int', default: 0 })
  elapsedSeconds: number;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({
    type: 'text',
    default: FailureStrategy.WAIT,
  })
  failureStrategy: FailureStrategy;

  @Column({ type: 'simple-json', nullable: true })
  valveMatrix: {
    valveId: number;
    targetState: string;
  }[];

  @Column({ type: 'datetime', nullable: true })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true })
  endTime: Date;

  @Column({ type: 'simple-json', nullable: true })
  spcResult: {
    temperatureCompliant: boolean;
    flowRateCompliant: boolean;
    conductivityCompliant: boolean;
    overallCompliant: boolean;
  };

  @ManyToOne(() => Job, (job) => job.jobSteps, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  jobId: number;

  @CreateDateColumn()
  createdAt: Date;
}
