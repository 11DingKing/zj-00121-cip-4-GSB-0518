import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Job, JobStatus } from '../job/entities/job.entity';
import { JobStep } from '../job/entities/job-step.entity';
import { ProgramTemplateVersion } from '../program-template/entities/program-template-version.entity';

export interface OeeStats {
  totalJobs: number;
  completedJobs: number;
  abortedJobs: number;
  averageDurationSeconds: number;
  successRate: number;
}

export interface OeeStatsByPeriod {
  period: string;
  stats: OeeStats;
}

export interface VersionOeeStats {
  versionId: number;
  versionNumber: number;
  changeDescription: string;
  stats: OeeStats;
}

export interface TemplateVersionComparison {
  templateId: number;
  templateName: string;
  versionStats: VersionOeeStats[];
}

@Injectable()
export class OeeService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobStep)
    private jobStepRepository: Repository<JobStep>,
    @InjectRepository(ProgramTemplateVersion)
    private versionRepository: Repository<ProgramTemplateVersion>,
  ) {}

  async getStats(
    lineId?: number,
    programTemplateId?: number,
    programTemplateVersionId?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OeeStats> {
    const whereConditions: any = {};
    if (lineId) whereConditions.lineId = lineId;
    if (programTemplateId) whereConditions.programTemplateId = programTemplateId;
    if (programTemplateVersionId) whereConditions.programTemplateVersionId = programTemplateVersionId;

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    }

    const totalJobs = await this.jobRepository.count({ where: whereConditions });

    const completedJobs = await this.jobRepository.count({
      where: { ...whereConditions, status: JobStatus.COMPLETED },
    });

    const abortedJobs = await this.jobRepository.count({
      where: { ...whereConditions, status: JobStatus.ABORTED },
    });

    const completedJobsList = await this.jobRepository.find({
      where: { ...whereConditions, status: JobStatus.COMPLETED },
    });

    const totalDuration = completedJobsList.reduce(
      (sum, job) => sum + (job.totalDurationSeconds || 0),
      0,
    );
    const averageDurationSeconds = completedJobs > 0 ? totalDuration / completedJobs : 0;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      completedJobs,
      abortedJobs,
      averageDurationSeconds,
      successRate,
    };
  }

  async getStatsByPeriod(
    period: 'day' | 'week' | 'month',
    lineId?: number,
    programTemplateId?: number,
    programTemplateVersionId?: number,
  ): Promise<OeeStatsByPeriod[]> {
    const now = new Date();
    const periods: { start: Date; end: Date; label: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const start = new Date(now);
      const end = new Date(now);

      if (period === 'day') {
        start.setDate(start.getDate() - i);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - i);
        end.setHours(23, 59, 59, 999);
        periods.push({ start, end, label: start.toISOString().split('T')[0] });
      } else if (period === 'week') {
        start.setDate(start.getDate() - i * 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - (i - 1) * 7);
        end.setHours(23, 59, 59, 999);
        periods.push({ start, end, label: `Week of ${start.toISOString().split('T')[0]}` });
      } else if (period === 'month') {
        start.setMonth(start.getMonth() - i);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() - i + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        periods.push({ start, end, label: `${start.getFullYear()}-${start.getMonth() + 1}` });
      }
    }

    const results: OeeStatsByPeriod[] = [];

    for (const p of periods) {
      const stats = await this.getStats(lineId, programTemplateId, programTemplateVersionId, p.start, p.end);
      results.push({ period: p.label, stats });
    }

    return results;
  }

  async compareTemplateVersions(templateId: number): Promise<TemplateVersionComparison> {
    const versions = await this.versionRepository.find({
      where: { programTemplateId: templateId },
      relations: ['programTemplate'],
      order: { versionNumber: 'DESC' },
    });

    if (versions.length === 0) {
      throw new Error('No versions found for template');
    }

    const versionStats: VersionOeeStats[] = [];

    for (const version of versions) {
      const stats = await this.getStats(undefined, templateId, version.id);
      versionStats.push({
        versionId: version.id,
        versionNumber: version.versionNumber,
        changeDescription: version.changeDescription || '',
        stats,
      });
    }

    return {
      templateId,
      templateName: versions[0].programTemplate.name,
      versionStats,
    };
  }
}
