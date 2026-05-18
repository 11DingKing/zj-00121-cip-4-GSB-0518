import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Line } from './line.entity';

@Entity()
export class Segment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'float', default: 0 })
  length: number;

  @Column({ type: 'float', default: 0 })
  diameter: number;

  @ManyToOne(() => Line, (line) => line.segments, { onDelete: 'CASCADE' })
  line: Line;

  @Column()
  lineId: number;

  @CreateDateColumn()
  createdAt: Date;
}
