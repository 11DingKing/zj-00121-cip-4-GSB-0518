import { Controller, Get, Param, Query, ParseIntPipe, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AlarmService } from './alarm.service';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';
import { AlarmStatus } from './entities/alarm.entity';

@Controller('alarms')
export class AlarmController {
  constructor(private readonly alarmService: AlarmService) {}

  @Get()
  findAll(
    @Query() paginationDto: CursorPaginationDto,
    @Query('jobId') jobId?: string,
    @Query('status') status?: AlarmStatus,
  ) {
    return this.alarmService.findAll(paginationDto, jobId ? parseInt(jobId) : undefined, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alarmService.findOne(id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledge(@Param('id', ParseIntPipe) id: number, @Body('acknowledgedBy') acknowledgedBy?: string) {
    return this.alarmService.acknowledge(id, acknowledgedBy);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.alarmService.resolve(id);
  }
}
