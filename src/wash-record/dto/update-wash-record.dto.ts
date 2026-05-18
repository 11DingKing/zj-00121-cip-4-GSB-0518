import { IsOptional, IsDateString, IsArray, IsString } from 'class-validator';
import { WashRecordStatus, StepSnapshot } from '../entities/wash-record.entity';

export class UpdateWashRecordDto {
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsString()
  status?: WashRecordStatus;

  @IsOptional()
  @IsArray()
  result?: StepSnapshot[];
}
