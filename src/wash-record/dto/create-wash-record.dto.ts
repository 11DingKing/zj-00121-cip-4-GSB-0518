import { IsString, IsOptional, IsInt, IsDateString, IsArray } from 'class-validator';
import { StepSnapshot } from '../entities/wash-record.entity';

export class CreateWashRecordDto {
  @IsInt()
  lineId: number;

  @IsInt()
  programTemplateId: number;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  @IsArray()
  result?: StepSnapshot[];
}
