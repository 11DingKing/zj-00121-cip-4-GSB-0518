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

  @Post(':id/abort')
  @HttpCode(HttpStatus.OK)
  abort(@Param('id', ParseIntPipe) id: number) {
    return this.washRecordService.abort(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body('result') result?: any,
  ) {
    return this.washRecordService.complete(id, result);
  }

  @Post(':id/fail')
  @HttpCode(HttpStatus.OK)
  fail(@Param('id', ParseIntPipe) id: number, @Body('result') result?: any) {
    return this.washRecordService.fail(id, result);
  }

  @Get('stats/line/:lineId')
  getStatsByLine(@Param('lineId', ParseIntPipe) lineId: number) {
    return this.washRecordService.getStatsByLine(lineId);
  }
}
