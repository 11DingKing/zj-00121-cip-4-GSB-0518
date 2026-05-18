import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Job } from './job.entity';

@Entity()
@Index(['jobId', 'timestamp'])
export class Measurement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  temperature: number;

  @Column({ type: 'float' })
  flowRate: number;

  @Column({ type: 'float' })
  conductivity: number;

  @Column({ type: 'int' })
  stepIndex: number;

  @Column()
  timestamp: Date;

  @ManyToOne(() => Job, (job) => job.measurements, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  jobId: number;

  @CreateDateColumn()
  createdAt: Date;
}
