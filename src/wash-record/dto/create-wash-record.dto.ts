import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateWashRecordDto {
  @IsInt()
  lineId: number;

  @IsInt()
  programTemplateId: number;

  @IsOptional()
  @IsString()
  operatorName?: string;
}
