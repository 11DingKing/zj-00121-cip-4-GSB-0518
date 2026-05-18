import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { OeeService } from './oee.service';

@Controller('oee')
export class OeeController {
  constructor(private readonly oeeService: OeeService) {}

  @Get('stats')
  getStats(
    @Query('lineId') lineId?: string,
    @Query('programTemplateId') programTemplateId?: string,
    @Query('programTemplateVersionId') programTemplateVersionId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.oeeService.getStats(
      lineId ? parseInt(lineId) : undefined,
      programTemplateId ? parseInt(programTemplateId) : undefined,
      programTemplateVersionId ? parseInt(programTemplateVersionId) : undefined,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('stats-by-period')
  getStatsByPeriod(
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
    @Query('lineId') lineId?: string,
    @Query('programTemplateId') programTemplateId?: string,
    @Query('programTemplateVersionId') programTemplateVersionId?: string,
  ) {
    return this.oeeService.getStatsByPeriod(
      period,
      lineId ? parseInt(lineId) : undefined,
      programTemplateId ? parseInt(programTemplateId) : undefined,
      programTemplateVersionId ? parseInt(programTemplateVersionId) : undefined,
    );
  }

  @Get('compare-template-versions')
  compareTemplateVersions(
    @Query('templateId', ParseIntPipe) templateId: number,
  ) {
    return this.oeeService.compareTemplateVersions(templateId);
  }
}
