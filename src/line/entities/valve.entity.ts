import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Line } from './line.entity';

export enum ValveState {
  OPEN = 'open',
  CLOSED = 'closed',
  UNKNOWN = 'unknown',
}

@Entity()
export class Valve {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'text',
    default: ValveState.CLOSED,
  })
  state: ValveState;

  @Column({ type: 'boolean', default: false })
  isControllable: boolean;

  @ManyToOne(() => Line, (line) => line.valves, { onDelete: 'CASCADE' })
  line: Line;

  @Column()
  lineId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
