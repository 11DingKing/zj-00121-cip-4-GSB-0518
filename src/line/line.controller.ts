import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { LineService } from './line.service';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { CursorPaginationDto } from '../common/dto/cursor-pagination.dto';

@Controller('lines')
export class LineController {
  constructor(private readonly lineService: LineService) {}

  @Post()
  create(@Body() createLineDto: CreateLineDto) {
    return this.lineService.create(createLineDto);
  }

  @Get()
  findAll(@Query() paginationDto: CursorPaginationDto) {
    return this.lineService.findAll(paginationDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lineService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLineDto: UpdateLineDto) {
    return this.lineService.update(id, updateLineDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lineService.remove(id);
  }
}
