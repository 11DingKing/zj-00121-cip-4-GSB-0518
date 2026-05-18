import { IsString, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { StepType, FailureStrategy } from '../entities/step.entity';

class StepDto {
  @IsString()
  name: string;

  @IsString()
  type: StepType;

  @IsNumber()
  order: number;

  @IsNumber()
  targetTemperature: number;

  @IsNumber()
  temperatureTolerance: number;

  @IsNumber()
  targetFlowRate: number;

  @IsNumber()
  flowRateTolerance: number;

  @IsNumber()
  targetConductivity: number;

  @IsNumber()
  conductivityTolerance: number;

  @IsNumber()
  holdTimeSeconds: number;

  @IsOptional()
  @IsString()
  failureStrategy?: FailureStrategy;

  @IsOptional()
  valveMatrix?: {
    valveId: number;
    targetState: string;
  }[];
}

export class ForkVersionDto {
  @IsOptional()
  @IsString()
  changeDescription?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];
}
