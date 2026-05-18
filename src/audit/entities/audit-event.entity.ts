import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum EventType {
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PAUSED = 'job_paused',
  JOB_RESUMED = 'job_resumed',
  JOB_COMPLETED = 'job_completed',
  JOB_ABORTED = 'job_aborted',
  JOB_FAILED = 'job_failed',
  STEP_STARTED = 'step_started',
  STEP_COMPLETED = 'step_completed',
  STEP_FAILED = 'step_failed',
  STEP_WAITING = 'step_waiting',
  STEP_RETRY = 'step_retry',
  VALVE_CHANGED = 'valve_changed',
  ALARM_TRIGGERED = 'alarm_triggered',
  ALARM_ACKNOWLEDGED = 'alarm_acknowledged',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
}

@Entity()
@Index(['jobId', 'timestamp'])
export class AuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'text',
  })
  eventType: EventType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, any>;

  @Column({ nullable: true })
  jobId: number;

  @Column({ nullable: true })
  userId: string;

  @Column()
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  previousHash: string;

  @Column({ type: 'text' })
  hash: string;

  @CreateDateColumn()
  createdAt: Date;
}
