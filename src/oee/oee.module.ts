import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OeeService } from './oee.service';
import { OeeController } from './oee.controller';
import { Job } from '../job/entities/job.entity';
import { JobStep } from '../job/entities/job-step.entity';
import { ProgramTemplateVersion } from '../program-template/entities/program-template-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobStep, ProgramTemplateVersion])],
  controllers: [OeeController],
  providers: [OeeService],
  exports: [OeeService],
})
export class OeeModule {}
