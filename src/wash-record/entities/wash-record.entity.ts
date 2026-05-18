import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { Line } from '../../line/entities/line.entity';
import { ProgramTemplate } from '../../program-template/entities/program-template.entity';

export enum WashRecordStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
  FAILED = 'failed',
}

export interface StepSnapshot {
  stepIndex: number;
  temperature?: number;
  flowRate?: number;
  concentration?: number;
  durationSeconds?: number;
}

@Entity()
@Index(['lineId', 'startedAt'])
export class WashRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Line)
  line: Line;

  @Column()
  lineId: number;

  @ManyToOne(() => ProgramTemplate)
  programTemplate: ProgramTemplate;

  @Column()
  programTemplateId: number;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({
    type: 'text',
    default: WashRecordStatus.RUNNING,
  })
  status: WashRecordStatus;

  @Column({ nullable: true })
  operatorName: string;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ type: 'simple-json', nullable: true })
  result: StepSnapshot[];
}
