import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateWashRecordDto {
  @IsInt()
  lineId: number;

  @IsInt()
  programTemplateId: number;

  @IsOptional()
  @IsString()
  operatorName?: string;

  @IsOptional()
  result?: Record<string, any>;
}
