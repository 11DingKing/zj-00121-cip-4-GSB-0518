import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgramTemplate } from './entities/program-template.entity';
import { ProgramTemplateVersion } from './entities/program-template-version.entity';
import { CreateProgramTemplateDto } from './dto/create-program-template.dto';
import { ForkVersionDto } from './dto/fork-version.dto';
import { VersionDiffResult, StepDiff, ChangeType } from './dto/version-diff.dto';
import { Step } from './entities/step.entity';
import { CursorPaginationDto, PaginatedResult } from '../common/dto/cursor-pagination.dto';

@Injectable()
export class ProgramTemplateService {
  constructor(
    @InjectRepository(ProgramTemplate)
    private programTemplateRepository: Repository<ProgramTemplate>,
    @InjectRepository(ProgramTemplateVersion)
    private versionRepository: Repository<ProgramTemplateVersion>,
    @InjectRepository(Step)
    private stepRepository: Repository<Step>,
  ) {}

  async create(createProgramTemplateDto: CreateProgramTemplateDto): Promise<ProgramTemplate> {
    const template = this.programTemplateRepository.create({
      name: createProgramTemplateDto.name,
      description: createProgramTemplateDto.description,
      lineId: createProgramTemplateDto.lineId,
    });
    const savedTemplate = await this.programTemplateRepository.save(template);

    const initialVersion = this.versionRepository.create({
      programTemplateId: savedTemplate.id,
      versionNumber: 1,
      changeDescription: 'Initial version',
      steps: createProgramTemplateDto.steps.map((step) =>
        this.stepRepository.create(step),
      ),
    });
    await this.versionRepository.save(initialVersion);

    return this.findOne(savedTemplate.id);
  }

  async findAll(paginationDto: CursorPaginationDto, lineId?: number): Promise<PaginatedResult<ProgramTemplate>> {
    const { cursor, limit = 20 } = paginationDto;
    const queryBuilder = this.programTemplateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.versions', 'versions')
      .orderBy('template.id', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('template.id < :cursor', { cursor: parseInt(cursor) });
    }

    if (lineId) {
      queryBuilder.andWhere('template.lineId = :lineId', { lineId });
    }

    const templates = await queryBuilder.getMany();
    const hasNext = templates.length > limit;
    const data = hasNext ? templates.slice(0, -1) : templates;

    return {
      data,
      meta: {
        hasNext,
        nextCursor: hasNext ? data[data.length - 1].id.toString() : undefined,
      },
    };
  }

  async findOne(id: number): Promise<ProgramTemplate> {
    const template = await this.programTemplateRepository.findOne({
      where: { id },
      relations: ['versions', 'versions.steps'],
      order: {
        versions: {
          versionNumber: 'DESC',
          steps: {
            order: 'ASC',
          },
        },
      },
    });
    if (!template) {
      throw new NotFoundException(`ProgramTemplate #${id} not found`);
    }
    return template;
  }

  async findVersions(templateId: number): Promise<ProgramTemplateVersion[]> {
    await this.findOne(templateId);
    return this.versionRepository.find({
      where: { programTemplateId: templateId },
      relations: ['steps', 'parentVersion', 'childVersions'],
      order: {
        versionNumber: 'DESC',
        steps: {
          order: 'ASC',
        },
      },
    });
  }

  async findVersion(templateId: number, versionId: number): Promise<ProgramTemplateVersion> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId, programTemplateId: templateId },
      relations: ['steps', 'parentVersion', 'childVersions', 'jobs'],
      order: {
        steps: {
          order: 'ASC',
        },
      },
    });
    if (!version) {
      throw new NotFoundException(`Version #${versionId} not found for template #${templateId}`);
    }
    return version;
  }

  async forkVersion(templateId: number, versionId: number, forkVersionDto: ForkVersionDto): Promise<ProgramTemplateVersion> {
    const parentVersion = await this.findVersion(templateId, versionId);

    const maxVersion = await this.versionRepository
      .createQueryBuilder('v')
      .select('MAX(v.versionNumber)', 'max')
      .where('v.programTemplateId = :templateId', { templateId })
      .getRawOne();

    const newVersionNumber = (maxVersion?.max || 0) + 1;

    const newVersion = this.versionRepository.create({
      programTemplateId: templateId,
      versionNumber: newVersionNumber,
      parentVersionId: versionId,
      changeDescription: forkVersionDto.changeDescription || `Forked from version ${parentVersion.versionNumber}`,
      isLocked: false,
      steps: forkVersionDto.steps.map((step) =>
        this.stepRepository.create(step),
      ),
    });

    return this.versionRepository.save(newVersion);
  }

  async diffVersions(templateId: number, versionAId: number, versionBId: number): Promise<VersionDiffResult> {
    const versionA = await this.findVersion(templateId, versionAId);
    const versionB = await this.findVersion(templateId, versionBId);

    const stepDiffs: StepDiff[] = [];
    const stepsA = new Map(versionA.steps.map((s) => [`${s.order}-${s.name}`, s]));
    const stepsB = new Map(versionB.steps.map((s) => [`${s.order}-${s.name}`, s]));

    for (const [key, stepB] of stepsB) {
      if (!stepsA.has(key)) {
        stepDiffs.push({
          stepName: stepB.name,
          changeType: ChangeType.ADDED,
          changes: Object.keys(stepB).filter((k) => k !== 'id' && k !== 'programTemplateVersionId').map((k) => ({
            field: k,
            newValue: stepB[k],
          })),
        });
      } else {
        const stepA = stepsA.get(key)!;
        const changes = [];
        for (const field of Object.keys(stepB)) {
          if (field === 'id' || field === 'programTemplateVersionId') continue;
          const valA = JSON.stringify(stepA[field]);
          const valB = JSON.stringify(stepB[field]);
          if (valA !== valB) {
            changes.push({
              field,
              oldValue: stepA[field],
              newValue: stepB[field],
            });
          }
        }
        if (changes.length > 0) {
          stepDiffs.push({
            stepName: stepB.name,
            changeType: ChangeType.MODIFIED,
            changes,
          });
        }
      }
    }

    for (const [key, stepA] of stepsA) {
      if (!stepsB.has(key)) {
        stepDiffs.push({
          stepName: stepA.name,
          changeType: ChangeType.REMOVED,
          changes: Object.keys(stepA).filter((k) => k !== 'id' && k !== 'programTemplateVersionId').map((k) => ({
            field: k,
            oldValue: stepA[k],
          })),
        });
      }
    }

    return {
      versionAId,
      versionBId,
      versionANumber: versionA.versionNumber,
      versionBNumber: versionB.versionNumber,
      stepDiffs,
      summary: {
        addedSteps: stepDiffs.filter((d) => d.changeType === ChangeType.ADDED).length,
        removedSteps: stepDiffs.filter((d) => d.changeType === ChangeType.REMOVED).length,
        modifiedSteps: stepDiffs.filter((d) => d.changeType === ChangeType.MODIFIED).length,
      },
    };
  }

  async lockVersion(templateId: number, versionId: number): Promise<ProgramTemplateVersion> {
    const version = await this.findVersion(templateId, versionId);
    version.isLocked = true;
    return this.versionRepository.save(version);
  }

  async checkAndLockIfUsed(templateId: number, versionId: number): Promise<void> {
    const version = await this.findVersion(templateId, versionId);
    if (version.jobs && version.jobs.length > 0 && !version.isLocked) {
      version.isLocked = true;
      await this.versionRepository.save(version);
    }
  }

  async remove(id: number): Promise<void> {
    const result = await this.programTemplateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ProgramTemplate #${id} not found`);
    }
  }
}
