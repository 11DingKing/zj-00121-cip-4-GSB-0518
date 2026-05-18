import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmService } from './alarm.service';
import { AlarmController } from './alarm.controller';
import { Alarm } from './entities/alarm.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alarm])],
  controllers: [AlarmController],
  providers: [AlarmService],
  exports: [AlarmService, TypeOrmModule],
})
export class AlarmModule {}
