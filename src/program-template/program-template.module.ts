import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramTemplateService } from './program-template.service';
import { ProgramTemplateController } from './program-template.controller';
import { ProgramTemplate } from './entities/program-template.entity';
import { ProgramTemplateVersion } from './entities/program-template-version.entity';
import { Step } from './entities/step.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramTemplate, ProgramTemplateVersion, Step])],
  controllers: [ProgramTemplateController],
  providers: [ProgramTemplateService],
  exports: [ProgramTemplateService, TypeOrmModule],
})
export class ProgramTemplateModule {}
