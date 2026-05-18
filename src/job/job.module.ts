import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { Job } from './entities/job.entity';
import { JobStep } from './entities/job-step.entity';
import { Measurement } from './entities/measurement.entity';
import { JobExecutionService } from './job-execution.service';
import { ProgramTemplateModule } from '../program-template/program-template.module';
import { AlarmModule } from '../alarm/alarm.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobStep, Measurement]),
    ProgramTemplateModule,
    AlarmModule,
    AuditModule,
  ],
  controllers: [JobController],
  providers: [JobService, JobExecutionService],
  exports: [JobService, JobExecutionService, TypeOrmModule],
})
export class JobModule {}
