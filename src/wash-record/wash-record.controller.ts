import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WashRecordService } from './wash-record.service';
import { CreateWashRecordDto } from './dto/create-wash-record.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

@Controller('wash-records')
export class WashRecordController {
  constructor(private readonly washRecordService: WashRecordService) {}

  @Post()
  create(@Body() createWashRecordDto: CreateWashRecordDto) {
    return this.washRecordService.create(createWashRecordDto);
  }

  @Get('line/:lineId')
  findByLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @Query() paginationDto: CursorPaginationDto,
  ) {
    return this.washRecordService.findByLine(lineId, paginationDto);
  }

  @Get('line/:lineId/stats')
  getStatsByLine(@Param('lineId', ParseIntPipe) lineId: number) {
    return this.washRecordService.getStatsByLine(lineId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.washRecordService.findOne(id);
  }

  @Post(':id/abort')
  @HttpCode(HttpStatus.OK)
  abort(@Param('id', ParseIntPipe) id: number) {
    return this.washRecordService.abort(id);
  }
}
