import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateJobDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  programTemplateId: number;

  @IsInt()
  programTemplateVersionId: number;

  @IsInt()
  lineId: number;

  @IsOptional()
  @IsString()
  triggeredBy?: string;
}
