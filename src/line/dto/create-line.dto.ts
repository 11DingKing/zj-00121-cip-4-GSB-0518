import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SegmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  length?: number;
  diameter?: number;
}

class ValveDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  isControllable?: boolean;
}

class TankDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  capacity?: number;
}

export class CreateLineDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentDto)
  segments?: SegmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValveDto)
  valves?: ValveDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TankDto)
  tanks?: TankDto[];

  @IsOptional()
  topology?: {
    segments: number[];
    valves: number[];
    tanks: number[];
    connections: Array<{ from: string; to: string; type: string }>;
  };
}
