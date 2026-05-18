import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ProgramTemplateService } from './program-template.service';
import { CreateProgramTemplateDto } from './dto/create-program-template.dto';
import { ForkVersionDto } from './dto/fork-version.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

@Controller('program-templates')
export class ProgramTemplateController {
  constructor(private readonly programTemplateService: ProgramTemplateService) {}

  @Post()
  create(@Body() createProgramTemplateDto: CreateProgramTemplateDto) {
    return this.programTemplateService.create(createProgramTemplateDto);
  }

  @Get()
  findAll(@Query() paginationDto: CursorPaginationDto, @Query('lineId') lineId?: string) {
    return this.programTemplateService.findAll(paginationDto, lineId ? parseInt(lineId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programTemplateService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.programTemplateService.remove(id);
  }

  @Get(':templateId/versions')
  findVersions(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.programTemplateService.findVersions(templateId);
  }

  @Get(':templateId/versions/:versionId')
  findVersion(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.programTemplateService.findVersion(templateId, versionId);
  }

  @Post(':templateId/versions/:versionId/fork')
  forkVersion(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() forkVersionDto: ForkVersionDto,
  ) {
    return this.programTemplateService.forkVersion(templateId, versionId, forkVersionDto);
  }

  @Get(':templateId/versions/:versionAId/diff/:versionBId')
  diffVersions(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('versionAId', ParseIntPipe) versionAId: number,
    @Param('versionBId', ParseIntPipe) versionBId: number,
  ) {
    return this.programTemplateService.diffVersions(templateId, versionAId, versionBId);
  }

  @Patch(':templateId/versions/:versionId/lock')
  lockVersion(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.programTemplateService.lockVersion(templateId, versionId);
  }
}
