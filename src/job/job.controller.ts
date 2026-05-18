import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';
import { JobStatus } from './entities/job.entity';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: CursorPaginationDto,
    @Query('lineId') lineId?: string,
    @Query('status') status?: JobStatus,
  ) {
    return this.jobService.findAll(paginationDto, lineId ? parseInt(lineId) : undefined, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.findOne(id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  startJob(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.startJob(id);
  }

  @Post(':id/abort')
  @HttpCode(HttpStatus.OK)
  abortJob(@Param('id', ParseIntPipe) id: number, @Body('reason') reason?: string) {
    return this.jobService.abortJob(id, reason);
  }

  @Get(':id/measurements')
  getMeasurements(@Param('id', ParseIntPipe) id: number) {
    return this.jobService.getMeasurements(id);
  }

  @Get(':id/running')
  isJobRunning(@Param('id', ParseIntPipe) id: number) {
    return { running: this.jobService.isJobRunning(id) };
  }
}
