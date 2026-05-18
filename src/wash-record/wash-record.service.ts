import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { WashRecord, WashRecordStatus } from './entities/wash-record.entity';
import { CreateWashRecordDto } from './dto/create-wash-record.dto';
import {
  CursorPaginationDto,
  PaginatedResult,
} from '../common/dto/cursor-pagination.dto';

export interface WashRecordStats {
  totalWashes: number;
  averageDurationSeconds: number;
  successRate: number;
  completedWashes: number;
  failedWashes: number;
  abortedWashes: number;
}

@Injectable()
export class WashRecordService {
  constructor(
    @InjectRepository(WashRecord)
    private washRecordRepository: Repository<WashRecord>,
  ) {}

  async create(createWashRecordDto: CreateWashRecordDto): Promise<WashRecord> {
    const washRecord = this.washRecordRepository.create({
      lineId: createWashRecordDto.lineId,
      programTemplateId: createWashRecordDto.programTemplateId,
      operatorName: createWashRecordDto.operatorName,
      status: WashRecordStatus.RUNNING,
      startedAt: new Date(),
    });

    return this.washRecordRepository.save(washRecord);
  }

  async findByLine(
    lineId: number,
    paginationDto: CursorPaginationDto,
  ): Promise<PaginatedResult<WashRecord>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.washRecordRepository
      .createQueryBuilder('washRecord')
      .where('washRecord.lineId = :lineId', { lineId })
      .orderBy('washRecord.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('washRecord.id < :cursor', {
        cursor: parseInt(cursor),
      });
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
    const washRecord = await this.washRecordRepository.findOne({
      where: { id },
    });
    if (!washRecord) {
      throw new NotFoundException(`Wash record #${id} not found`);
    }
    return washRecord;
  }

  async abort(id: number): Promise<WashRecord> {
    const washRecord = await this.findOne(id);

    if (washRecord.status !== WashRecordStatus.RUNNING) {
      throw new BadRequestException(`Wash record #${id} is not running`);
    }

    washRecord.status = WashRecordStatus.ABORTED;
    washRecord.completedAt = new Date();
    washRecord.duration = Math.floor(
      (washRecord.completedAt.getTime() - washRecord.startedAt.getTime()) /
        1000,
    );

    return this.washRecordRepository.save(washRecord);
  }

  async complete(
    id: number,
    result?: WashRecord['result'],
  ): Promise<WashRecord> {
    const washRecord = await this.findOne(id);

    if (washRecord.status !== WashRecordStatus.RUNNING) {
      throw new BadRequestException(`Wash record #${id} is not running`);
    }

    washRecord.status = WashRecordStatus.COMPLETED;
    washRecord.completedAt = new Date();
    washRecord.duration = Math.floor(
      (washRecord.completedAt.getTime() - washRecord.startedAt.getTime()) /
        1000,
    );
    if (result) {
      washRecord.result = result;
    }

    return this.washRecordRepository.save(washRecord);
  }

  async fail(id: number, result?: WashRecord['result']): Promise<WashRecord> {
    const washRecord = await this.findOne(id);

    if (washRecord.status !== WashRecordStatus.RUNNING) {
      throw new BadRequestException(`Wash record #${id} is not running`);
    }

    washRecord.status = WashRecordStatus.FAILED;
    washRecord.completedAt = new Date();
    washRecord.duration = Math.floor(
      (washRecord.completedAt.getTime() - washRecord.startedAt.getTime()) /
        1000,
    );
    if (result) {
      washRecord.result = result;
    }

    return this.washRecordRepository.save(washRecord);
  }

  async getStatsByLine(lineId: number): Promise<WashRecordStats> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const whereConditions = {
      lineId,
      startedAt: MoreThanOrEqual(thirtyDaysAgo),
    };

    const totalWashes = await this.washRecordRepository.count({
      where: whereConditions,
    });

    const completedWashes = await this.washRecordRepository.count({
      where: { ...whereConditions, status: WashRecordStatus.COMPLETED },
    });

    const failedWashes = await this.washRecordRepository.count({
      where: { ...whereConditions, status: WashRecordStatus.FAILED },
    });

    const abortedWashes = await this.washRecordRepository.count({
      where: { ...whereConditions, status: WashRecordStatus.ABORTED },
    });

    const completedRecords = await this.washRecordRepository.find({
      where: { ...whereConditions, status: WashRecordStatus.COMPLETED },
      select: ['duration'],
    });

    const totalDuration = completedRecords.reduce(
      (sum, record) => sum + (record.duration || 0),
      0,
    );
    const averageDurationSeconds =
      completedWashes > 0 ? totalDuration / completedWashes : 0;
    const successRate =
      totalWashes > 0 ? (completedWashes / totalWashes) * 100 : 0;

    return {
      totalWashes,
      averageDurationSeconds,
      successRate,
      completedWashes,
      failedWashes,
      abortedWashes,
    };
  }
}
