import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineModule } from './line/line.module';
import { ProgramTemplateModule } from './program-template/program-template.module';
import { JobModule } from './job/job.module';
import { AlarmModule } from './alarm/alarm.module';
import { AuditModule } from './audit/audit.module';
import { OeeModule } from './oee/oee.module';
import { WashRecordModule } from './wash-record/wash-record.module';
import { SeedService } from './seed/seed.service';
import { Line } from './line/entities/line.entity';
import { Segment } from './line/entities/segment.entity';
import { Valve } from './line/entities/valve.entity';
import { Tank } from './line/entities/tank.entity';
import { ProgramTemplate } from './program-template/entities/program-template.entity';
import { ProgramTemplateVersion } from './program-template/entities/program-template-version.entity';
import { Step } from './program-template/entities/step.entity';
import { Job } from './job/entities/job.entity';
import { JobStep } from './job/entities/job-step.entity';
import { Measurement } from './job/entities/measurement.entity';
import { WashRecord } from './wash-record/entities/wash-record.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'cip.db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([
      Line,
      Segment,
      Valve,
      Tank,
      ProgramTemplate,
      ProgramTemplateVersion,
      Step,
      Job,
      JobStep,
      Measurement,
      WashRecord,
    ]),
    LineModule,
    ProgramTemplateModule,
    JobModule,
    AlarmModule,
    AuditModule,
    OeeModule,
    WashRecordModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
