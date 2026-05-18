import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Segment } from './segment.entity';
import { Valve } from './valve.entity';
import { Tank } from './tank.entity';

export enum LineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  MAINTENANCE = 'maintenance',
}

@Entity()
export class Line {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'text',
    default: LineStatus.IDLE,
  })
  status: LineStatus;

  @Column({ type: 'simple-json', nullable: true })
  topology: {
    segments: number[];
    valves: number[];
    tanks: number[];
    connections: Array<{ from: string; to: string; type: string }>;
  };

  @OneToMany(() => Segment, (segment) => segment.line, { cascade: true })
  segments: Segment[];

  @OneToMany(() => Valve, (valve) => valve.line, { cascade: true })
  valves: Valve[];

  @OneToMany(() => Tank, (tank) => tank.line, { cascade: true })
  tanks: Tank[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
