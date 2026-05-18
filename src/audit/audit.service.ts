import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';
import { Job } from '../job/entities/job.entity';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEvent)
    private auditEventRepository: Repository<AuditEvent>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  async findAll(
    paginationDto: CursorPaginationDto,
    jobId?: number,
  ): Promise<PaginatedResult<AuditEvent>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.auditEventRepository
      .createQueryBuilder('audit')
      .orderBy('audit.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('audit.id < :cursor', { cursor: parseInt(cursor) });
    }

    if (jobId) {
      queryBuilder.andWhere('audit.jobId = :jobId', { jobId });
    }

    const events = await queryBuilder.getMany();
    const hasNext = events.length > limit;
    const data = hasNext ? events.slice(0, -1) : events;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async verifyChain(jobId: number): Promise<{ valid: boolean; invalidEventId?: number }> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      return { valid: false };
    }

    const events = await this.auditEventRepository.find({
      where: { jobId },
      order: { id: 'ASC' },
    });

    if (events.length === 0) {
      return { valid: false };
    }

    for (let i = 1; i < events.length; i++) {
      const current = events[i];
      const previous = events[i - 1];

      if (current.previousHash !== previous.hash) {
        return { valid: false, invalidEventId: current.id };
      }
    }

    return { valid: true };
  }
}
