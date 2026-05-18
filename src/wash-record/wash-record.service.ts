import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashRecord, WashRecordStatus } from './entities/wash-record.entity';
import { CreateWashRecordDto } from './dto/create-wash-record.dto';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

export interface WashRecordStats {
  totalWashes: number;
  avgDuration: number;
  successRate: number;
}

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
      operatorName: dto.operatorName,
      startedAt: new Date(),
      status: WashRecordStatus.RUNNING,
      result: dto.result ?? null,
    });
    return this.washRecordRepository.save(record);
  }

  async findByLine(lineId: number, paginationDto: CursorPaginationDto): Promise<PaginatedResult<WashRecord>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.washRecordRepository
      .createQueryBuilder('washRecord')
      .leftJoinAndSelect('washRecord.line', 'line')
      .leftJoinAndSelect('washRecord.programTemplate', 'programTemplate')
      .where('washRecord.lineId = :lineId', { lineId })
      .orderBy('washRecord.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('washRecord.id < :cursor', { cursor: parseInt(cursor) });
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
    const record = await this.washRecordRepository.findOne({
      where: { id },
      relations: ['line', 'programTemplate'],
    });
    if (!record) {
      throw new NotFoundException(`WashRecord #${id} not found`);
    }
    return record;
  }

  async abort(id: number): Promise<WashRecord> {
    const record = await this.findOne(id);

    if (record.status !== WashRecordStatus.RUNNING) {
      throw new BadRequestException(`WashRecord #${id} is not running (current status: ${record.status})`);
    }

    const now = new Date();
    record.status = WashRecordStatus.ABORTED;
    record.completedAt = now;
    record.duration = Math.round((now.getTime() - record.startedAt.getTime()) / 1000);

    return this.washRecordRepository.save(record);
  }

  async getStatsByLine(lineId: number): Promise<WashRecordStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.washRecordRepository
      .createQueryBuilder('washRecord')
      .where('washRecord.lineId = :lineId', { lineId })
      .andWhere('washRecord.startedAt >= :since', { since: thirtyDaysAgo.toISOString() })
      .getMany();

    const totalWashes = records.length;
    const completedRecords = records.filter((r) => r.status === WashRecordStatus.COMPLETED);

    const avgDuration =
      completedRecords.length > 0
        ? completedRecords.reduce((sum, r) => sum + (r.duration ?? 0), 0) / completedRecords.length
        : 0;

    const successRate = totalWashes > 0 ? completedRecords.length / totalWashes : 0;

    return {
      totalWashes,
      avgDuration: Math.round(avgDuration),
      successRate: parseFloat(successRate.toFixed(4)),
    };
  }
}
