import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('events')
  findAll(@Query() paginationDto: CursorPaginationDto, @Query('jobId') jobId?: string) {
    return this.auditService.findAll(paginationDto, jobId ? parseInt(jobId) : undefined);
  }

  @Get('verify/:jobId')
  verifyChain(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.auditService.verifyChain(jobId);
  }
}
