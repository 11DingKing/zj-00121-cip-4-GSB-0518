import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Job } from '../../job/entities/job.entity';

export enum AlarmType {
  TEMPERATURE_HIGH = 'temperature_high',
  TEMPERATURE_LOW = 'temperature_low',
  FLOW_RATE_HIGH = 'flow_rate_high',
  FLOW_RATE_LOW = 'flow_rate_low',
  CONDUCTIVITY_HIGH = 'conductivity_high',
  CONDUCTIVITY_LOW = 'conductivity_low',
  VALVE_POSITION = 'valve_position',
  STEP_TIMEOUT = 'step_timeout',
  SYSTEM_ERROR = 'system_error',
}

export enum AlarmSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlarmStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

@Entity()
@Index(['jobId', 'timestamp'])
export class Alarm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'text',
  })
  type: AlarmType;

  @Column({
    type: 'text',
    default: AlarmSeverity.WARNING,
  })
  severity: AlarmSeverity;

  @Column({
    type: 'text',
    default: AlarmStatus.ACTIVE,
  })
  status: AlarmStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  stepIndex: number;

  @Column()
  timestamp: Date;

  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date;

  @Column({ nullable: true })
  acknowledgedBy: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE', nullable: true })
  job: Job;

  @Column({ nullable: true })
  jobId: number;

  @CreateDateColumn()
  createdAt: Date;
}
