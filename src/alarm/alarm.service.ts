import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alarm, AlarmStatus } from './entities/alarm.entity';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

@Injectable()
export class AlarmService {
  constructor(
    @InjectRepository(Alarm)
    private alarmRepository: Repository<Alarm>,
  ) {}

  async findAll(
    paginationDto: CursorPaginationDto,
    jobId?: number,
    status?: AlarmStatus,
  ): Promise<PaginatedResult<Alarm>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.alarmRepository
      .createQueryBuilder('alarm')
      .orderBy('alarm.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('alarm.id < :cursor', { cursor: parseInt(cursor) });
    }

    if (jobId) {
      queryBuilder.andWhere('alarm.jobId = :jobId', { jobId });
    }

    if (status) {
      queryBuilder.andWhere('alarm.status = :status', { status });
    }

    const alarms = await queryBuilder.getMany();
    const hasNext = alarms.length > limit;
    const data = hasNext ? alarms.slice(0, -1) : alarms;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async findOne(id: number): Promise<Alarm> {
    const alarm = await this.alarmRepository.findOne({ where: { id } });
    if (!alarm) {
      throw new NotFoundException(`Alarm #${id} not found`);
    }
    return alarm;
  }

  async acknowledge(id: number, acknowledgedBy?: string): Promise<Alarm> {
    const alarm = await this.findOne(id);
    alarm.status = AlarmStatus.ACKNOWLEDGED;
    alarm.acknowledgedAt = new Date();
    alarm.acknowledgedBy = acknowledgedBy;
    return this.alarmRepository.save(alarm);
  }

  async resolve(id: number): Promise<Alarm> {
    const alarm = await this.findOne(id);
    alarm.status = AlarmStatus.RESOLVED;
    return this.alarmRepository.save(alarm);
  }
}
