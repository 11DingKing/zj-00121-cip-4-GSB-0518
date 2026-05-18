import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Line } from '../../line/entities/line.entity';
import { ProgramTemplate } from '../../program-template/entities/program-template.entity';

export enum WashRecordStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  ABORTED = 'aborted',
  FAILED = 'failed',
}

@Entity()
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

  @Column({ type: 'text', nullable: true })
  operatorName: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ type: 'simple-json', nullable: true })
  result: {
    steps?: Array<{
      name: string;
      temperature?: number;
      flowRate?: number;
      concentration?: number;
      duration?: number;
      success?: boolean;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
