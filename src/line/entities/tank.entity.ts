import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Line } from './line.entity';

@Entity()
export class Tank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'float', default: 0 })
  capacity: number;

  @Column({ type: 'float', default: 0 })
  currentLevel: number;

  @Column({ type: 'float', default: 0 })
  currentTemperature: number;

  @ManyToOne(() => Line, (line) => line.tanks, { onDelete: 'CASCADE' })
  line: Line;

  @Column()
  lineId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
