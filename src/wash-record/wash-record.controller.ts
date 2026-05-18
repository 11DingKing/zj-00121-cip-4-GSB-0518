import { Controller, Get, Post, Put, Param, Query, ParseIntPipe, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WashRecordService } from './wash-record.service';
import { CreateWashRecordDto } from './dto/create-wash-record.dto';
import { UpdateWashRecordDto } from './dto/update-wash-record.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

@Controller('wash-records')
export class WashRecordController {
  constructor(private readonly washRecordService: WashRecordService) {}

  @Post()
  create(@Body() dto: CreateWashRecordDto) {
    return this.washRecordService.create(dto);
  }

  @Get()
  findByLine(
    @Query('lineId', ParseIntPipe) lineId: number,
    @Query() paginationDto: CursorPaginationDto,
  ) {
    return this.washRecordService.findByLine(lineId, paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.washRecordService.findOne(id);
  }

  @Get('stats/by-line')
  getStatsByLine(@Query('lineId', ParseIntPipe) lineId: number) {
    return this.washRecordService.getStatsByLine(lineId);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWashRecordDto) {
    return this.washRecordService.update(id, dto);
  }

  @Post(':id/abort')
  @HttpCode(HttpStatus.OK)
  abort(@Param('id', ParseIntPipe) id: number) {
    return this.washRecordService.abort(id);
  }
}
