import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { ProgramTemplateVersion } from './program-template-version.entity';

export enum StepType {
  PRE_RINSE = 'pre_rinse',
  CAUSTIC_WASH = 'caustic_wash',
  INTERMEDIATE_RINSE = 'intermediate_rinse',
  ACID_WASH = 'acid_wash',
  FINAL_RINSE = 'final_rinse',
  SANITIZATION = 'sanitization',
}

export enum FailureStrategy {
  WAIT = 'wait',
  RETRY = 'retry',
  ABORT = 'abort',
}

@Entity()
export class Step {
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

  @ManyToOne(() => ProgramTemplateVersion, (version) => version.steps, {
    onDelete: 'CASCADE',
  })
  programTemplateVersion: ProgramTemplateVersion;

  @Column()
  programTemplateVersionId: number;

  @CreateDateColumn()
  createdAt: Date;
}
