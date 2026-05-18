import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineService } from './line.service';
import { LineController } from './line.controller';
import { Line } from './entities/line.entity';
import { Segment } from './entities/segment.entity';
import { Valve } from './entities/valve.entity';
import { Tank } from './entities/tank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Line, Segment, Valve, Tank])],
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService, TypeOrmModule],
})
export class LineModule {}
