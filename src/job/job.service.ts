import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { JobStep } from './entities/job-step.entity';
import { Measurement } from './entities/measurement.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { ProgramTemplateService } from '../program-template/program-template.service';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';
import { JobExecutionService } from './job-execution.service';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobStep)
    private jobStepRepository: Repository<JobStep>,
    @InjectRepository(Measurement)
    private measurementRepository: Repository<Measurement>,
    private programTemplateService: ProgramTemplateService,
    private jobExecutionService: JobExecutionService,
  ) {}

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const template = await this.programTemplateService.findOne(createJobDto.programTemplateId);
    const version = await this.programTemplateService.findVersion(
      createJobDto.programTemplateId,
      createJobDto.programTemplateVersionId,
    );

    if (version.programTemplateId !== template.id) {
      throw new BadRequestException('Version does not belong to the specified template');
    }

    const job = this.jobRepository.create({
      name: createJobDto.name,
      description: createJobDto.description,
      lineId: createJobDto.lineId,
      programTemplateId: createJobDto.programTemplateId,
      programTemplateVersionId: createJobDto.programTemplateVersionId,
      triggeredBy: createJobDto.triggeredBy,
      status: JobStatus.PENDING,
    });

    const savedJob = await this.jobRepository.save(job);

    const jobSteps = version.steps.map((step) =>
      this.jobStepRepository.create({
        jobId: savedJob.id,
        name: step.name,
        type: step.type,
        order: step.order,
        targetTemperature: step.targetTemperature,
        temperatureTolerance: step.temperatureTolerance,
        targetFlowRate: step.targetFlowRate,
        flowRateTolerance: step.flowRateTolerance,
        targetConductivity: step.targetConductivity,
        conductivityTolerance: step.conductivityTolerance,
        holdTimeSeconds: step.holdTimeSeconds,
        failureStrategy: step.failureStrategy,
        valveMatrix: step.valveMatrix,
      }),
    );

    await this.jobStepRepository.save(jobSteps);
    await this.programTemplateService.lockVersion(template.id, version.id);

    return this.findOne(savedJob.id);
  }

  async findAll(
    paginationDto: CursorPaginationDto,
    lineId?: number,
    status?: JobStatus,
  ): Promise<PaginatedResult<Job>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.jobSteps', 'jobSteps')
      .orderBy('job.id', 'DESC')
      .addOrderBy('jobSteps.order', 'ASC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('job.id < :cursor', { cursor: parseInt(cursor) });
    }

    if (lineId) {
      queryBuilder.andWhere('job.lineId = :lineId', { lineId });
    }

    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    const jobs = await queryBuilder.getMany();
    const hasNext = jobs.length > limit;
    const data = hasNext ? jobs.slice(0, -1) : jobs;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async findOne(id: number): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['jobSteps'],
      order: {
        jobSteps: {
          order: 'ASC',
        },
      },
    });
    if (!job) {
      throw new NotFoundException(`Job #${id} not found`);
    }
    return job;
  }

  async startJob(id: number): Promise<Job> {
    return this.jobExecutionService.startJob(id);
  }

  async abortJob(id: number, reason?: string): Promise<Job> {
    return this.jobExecutionService.abortJob(id, reason);
  }

  async getMeasurements(id: number): Promise<Measurement[]> {
    return this.measurementRepository.find({
      where: { jobId: id },
      order: { timestamp: 'ASC' },
    });
  }

  isJobRunning(id: number): boolean {
    return this.jobExecutionService.isJobRunning(id);
  }
}
