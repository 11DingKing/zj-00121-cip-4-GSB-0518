import { IsString, IsOptional, IsInt, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { StepType, FailureStrategy } from '../entities/step.entity';

class StepDto {
  @IsString()
  name: string;

  @IsString()
  type: StepType;

  @IsInt()
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

  @IsInt()
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

export class CreateProgramTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  lineId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];
}
