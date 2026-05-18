import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Line } from './entities/line.entity';
import { CreateLineDto } from './dto/create-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

@Injectable()
export class LineService {
  constructor(
    @InjectRepository(Line)
    private lineRepository: Repository<Line>,
  ) {}

  async create(createLineDto: CreateLineDto): Promise<Line> {
    const line = this.lineRepository.create(createLineDto);
    return this.lineRepository.save(line);
  }

  async findAll(paginationDto: CursorPaginationDto): Promise<PaginatedResult<Line>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.lineRepository
      .createQueryBuilder('line')
      .leftJoinAndSelect('line.segments', 'segments')
      .leftJoinAndSelect('line.valves', 'valves')
      .leftJoinAndSelect('line.tanks', 'tanks')
      .orderBy('line.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('line.id < :cursor', { cursor: parseInt(cursor) });
    }

    const lines = await queryBuilder.getMany();
    const hasNext = lines.length > limit;
    const data = hasNext ? lines.slice(0, -1) : lines;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async findOne(id: number): Promise<Line> {
    const line = await this.lineRepository.findOne({
      where: { id },
      relations: ['segments', 'valves', 'tanks'],
    });
    if (!line) {
      throw new NotFoundException(`Line #${id} not found`);
    }
    return line;
  }

  async update(id: number, updateLineDto: UpdateLineDto): Promise<Line> {
    const line = await this.findOne(id);
    Object.assign(line, updateLineDto);
    return this.lineRepository.save(line);
  }

  async remove(id: number): Promise<void> {
    const result = await this.lineRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Line #${id} not found`);
    }
  }
}
