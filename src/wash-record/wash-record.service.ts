import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashRecord, WashRecordStatus } from './entities/wash-record.entity';
import { CreateWashRecordDto } from './dto/create-wash-record.dto';
import { UpdateWashRecordDto } from './dto/update-wash-record.dto';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

@Injectable()
export class WashRecordService {
  constructor(
    @InjectRepository(WashRecord)
    private washRecordRepository: Repository<WashRecord>,
  ) {}

  async create(dto: CreateWashRecordDto): Promise<WashRecord> {
    const record = this.washRecordRepository.create({
      lineId: dto.lineId,
      programTemplateId: dto.programTemplateId,
      startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
      operatorName: dto.operatorName,
      result: dto.result,
      status: WashRecordStatus.RUNNING,
      duration: 0,
    });
    return this.washRecordRepository.save(record);
  }

  async findByLine(
    lineId: number,
    paginationDto: CursorPaginationDto,
  ): Promise<PaginatedResult<WashRecord>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.washRecordRepository
      .createQueryBuilder('wr')
      .where('wr.lineId = :lineId', { lineId })
      .orderBy('wr.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('wr.id < :cursor', { cursor: parseInt(cursor) });
    }

    const records = await queryBuilder.getMany();
    const hasNext = records.length > limit;
    const data = hasNext ? records.slice(0, -1) : records;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async findOne(id: number): Promise<WashRecord> {
    const record = await this.washRecordRepository.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException(`WashRecord #${id} not found`);
    }
    return record;
  }

  async update(id: number, dto: UpdateWashRecordDto): Promise<WashRecord> {
    const record = await this.findOne(id);

    if (dto.status && dto.status !== WashRecordStatus.RUNNING && !record.completedAt) {
      record.completedAt = dto.completedAt ? new Date(dto.completedAt) : new Date();
      record.duration = Math.floor((record.completedAt.getTime() - record.startedAt.getTime()) / 1000);
    } else if (dto.completedAt) {
      record.completedAt = new Date(dto.completedAt);
      record.duration = Math.floor((record.completedAt.getTime() - record.startedAt.getTime()) / 1000);
    }

    if (dto.status) record.status = dto.status;
    if (dto.result) record.result = dto.result;

    return this.washRecordRepository.save(record);
  }

  async abort(id: number): Promise<WashRecord> {
    const record = await this.findOne(id);
    if (record.status !== WashRecordStatus.RUNNING) {
      throw new ConflictException(`Only running records can be aborted. Current status: ${record.status}`);
    }
    record.status = WashRecordStatus.ABORTED;
    record.completedAt = new Date();
    record.duration = Math.floor((record.completedAt.getTime() - record.startedAt.getTime()) / 1000);
    return this.washRecordRepository.save(record);
  }

  async getStatsByLine(lineId: number): Promise<{
    totalCount: number;
    avgDuration: number;
    successRate: number;
    period: { start: Date; end: Date };
  }> {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const records = await this.washRecordRepository
      .createQueryBuilder('wr')
      .where('wr.lineId = :lineId', { lineId })
      .andWhere('wr.startedAt >= :start', { start })
      .andWhere('wr.startedAt <= :end', { end })
      .getMany();

    const totalCount = records.length;
    const completed = records.filter((r) => r.status === WashRecordStatus.COMPLETED);
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((sum, r) => sum + (r.duration || 0), 0) / completed.length)
      : 0;
    const successRate = totalCount > 0 ? completed.length / totalCount : 0;

    return {
      totalCount,
      avgDuration,
      successRate,
      period: { start, end },
    };
  }
}
