import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Line } from '../line/entities/line.entity';
import { Segment } from '../line/entities/segment.entity';
import { Valve } from '../line/entities/valve.entity';
import { Tank } from '../line/entities/tank.entity';
import { ProgramTemplate } from '../program-template/entities/program-template.entity';
import { ProgramTemplateVersion } from '../program-template/entities/program-template-version.entity';
import { Step, StepType, FailureStrategy } from '../program-template/entities/step.entity';
import { Job, JobStatus } from '../job/entities/job.entity';
import { JobStep, JobStepStatus } from '../job/entities/job-step.entity';
import { Measurement } from '../job/entities/measurement.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Line)
    private lineRepository: Repository<Line>,
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Valve)
    private valveRepository: Repository<Valve>,
    @InjectRepository(Tank)
    private tankRepository: Repository<Tank>,
    @InjectRepository(ProgramTemplate)
    private programTemplateRepository: Repository<ProgramTemplate>,
    @InjectRepository(ProgramTemplateVersion)
    private versionRepository: Repository<ProgramTemplateVersion>,
    @InjectRepository(Step)
    private stepRepository: Repository<Step>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobStep)
    private jobStepRepository: Repository<JobStep>,
    @InjectRepository(Measurement)
    private measurementRepository: Repository<Measurement>,
  ) {}

  async onModuleInit() {
    const lineCount = await this.lineRepository.count();
    if (lineCount === 0) {
      console.log('Seeding initial data...');
      await this.seedData();
      console.log('Seeding completed!');
    }
  }

  private async seedData() {
    const line = await this.createDairyLine();
    const templateVersions = await this.createProgramTemplates(line.id);
    await this.createSampleJob(line.id, templateVersions[0]);
  }

  private async createDairyLine(): Promise<Line> {
    const line = this.lineRepository.create({
      name: 'Dairy Production Line A',
      description: 'Main CIP line for dairy production including pasteurization and filling',
      topology: {
        segments: [],
        valves: [],
        tanks: [],
        connections: [],
      },
    });
    const savedLine = await this.lineRepository.save(line);

    const segments = await this.segmentRepository.save([
      { name: 'Pasteurization Inlet', description: 'Line section before pasteurizer', length: 15, diameter: 100, lineId: savedLine.id },
      { name: 'Pasteurization Outlet', description: 'Line section after pasteurizer', length: 20, diameter: 100, lineId: savedLine.id },
      { name: 'Filling Line', description: 'Product line to filling machines', length: 30, diameter: 80, lineId: savedLine.id },
    ]);

    const valves = await this.valveRepository.save([
      { name: 'V-101', description: 'Main inlet valve', isControllable: true, lineId: savedLine.id },
      { name: 'V-102', description: 'Pasteurizer bypass valve', isControllable: true, lineId: savedLine.id },
      { name: 'V-103', description: 'CIP supply valve', isControllable: true, lineId: savedLine.id },
      { name: 'V-104', description: 'Drain valve', isControllable: true, lineId: savedLine.id },
      { name: 'V-105', description: 'Return valve', isControllable: true, lineId: savedLine.id },
    ]);

    const tanks = await this.tankRepository.save([
      { name: 'T-201', description: 'Raw milk balance tank', capacity: 5000, currentLevel: 2500, currentTemperature: 4, lineId: savedLine.id },
      { name: 'T-202', description: 'Pasteurized milk tank', capacity: 10000, currentLevel: 5000, currentTemperature: 4, lineId: savedLine.id },
      { name: 'T-203', description: 'CIP chemical tank', capacity: 2000, currentLevel: 1500, currentTemperature: 20, lineId: savedLine.id },
    ]);

    savedLine.topology = {
      segments: segments.map(s => s.id),
      valves: valves.map(v => v.id),
      tanks: tanks.map(t => t.id),
      connections: [
        { from: 'T-201', to: 'V-101', type: 'segment' },
        { from: 'V-101', to: 'Pasteurization Inlet', type: 'segment' },
        { from: 'Pasteurization Inlet', to: 'Pasteurization Outlet', type: 'segment' },
        { from: 'Pasteurization Outlet', to: 'V-102', type: 'segment' },
        { from: 'V-102', to: 'Filling Line', type: 'segment' },
        { from: 'Filling Line', to: 'T-202', type: 'segment' },
      ],
    };

    return this.lineRepository.save(savedLine);
  }

  private async createProgramTemplates(lineId: number): Promise<ProgramTemplateVersion[]> {
    const templateVersions: ProgramTemplateVersion[] = [];

    const template1 = this.programTemplateRepository.create({
      name: 'Standard Dairy CIP - 60°C',
      description: 'Standard CIP program for dairy lines with alkaline and acid wash',
      lineId,
    });
    const savedTemplate1 = await this.programTemplateRepository.save(template1);

    const version1 = this.versionRepository.create({
      programTemplateId: savedTemplate1.id,
      versionNumber: 1,
      changeDescription: 'Initial version',
    });
    const savedVersion1 = await this.versionRepository.save(version1);

    await this.stepRepository.save([
      {
        name: 'Pre-Rinse',
        type: StepType.PRE_RINSE,
        order: 1,
        targetTemperature: 25,
        temperatureTolerance: 5,
        targetFlowRate: 5000,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 180,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 4, targetState: 'closed' }],
      },
      {
        name: 'Alkaline Wash',
        type: StepType.CAUSTIC_WASH,
        order: 2,
        targetTemperature: 60,
        temperatureTolerance: 3,
        targetFlowRate: 6000,
        flowRateTolerance: 500,
        targetConductivity: 1500,
        conductivityTolerance: 200,
        holdTimeSeconds: 600,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 5, targetState: 'open' }],
      },
      {
        name: 'Intermediate Rinse',
        type: StepType.INTERMEDIATE_RINSE,
        order: 3,
        targetTemperature: 30,
        temperatureTolerance: 5,
        targetFlowRate: 5000,
        flowRateTolerance: 500,
        targetConductivity: 200,
        conductivityTolerance: 50,
        holdTimeSeconds: 240,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 4, targetState: 'open' }],
      },
      {
        name: 'Acid Wash',
        type: StepType.ACID_WASH,
        order: 4,
        targetTemperature: 55,
        temperatureTolerance: 3,
        targetFlowRate: 5500,
        flowRateTolerance: 500,
        targetConductivity: 1200,
        conductivityTolerance: 150,
        holdTimeSeconds: 480,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 5, targetState: 'open' }],
      },
      {
        name: 'Final Rinse',
        type: StepType.FINAL_RINSE,
        order: 5,
        targetTemperature: 25,
        temperatureTolerance: 5,
        targetFlowRate: 5000,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 300,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 4, targetState: 'open' }],
      },
      {
        name: 'Sanitization',
        type: StepType.SANITIZATION,
        order: 6,
        targetTemperature: 85,
        temperatureTolerance: 2,
        targetFlowRate: 4000,
        flowRateTolerance: 400,
        targetConductivity: 500,
        conductivityTolerance: 100,
        holdTimeSeconds: 360,
        programTemplateVersionId: savedVersion1.id,
        failureStrategy: FailureStrategy.WAIT,
        valveMatrix: [{ valveId: 3, targetState: 'open' }, { valveId: 5, targetState: 'open' }],
      },
    ]);
    templateVersions.push(savedVersion1);

    const template2 = this.programTemplateRepository.create({
      name: 'Quick CIP - 50°C',
      description: 'Quick CIP program for minor product changeovers',
      lineId,
    });
    const savedTemplate2 = await this.programTemplateRepository.save(template2);

    const version2 = this.versionRepository.create({
      programTemplateId: savedTemplate2.id,
      versionNumber: 1,
      changeDescription: 'Initial version',
    });
    const savedVersion2 = await this.versionRepository.save(version2);

    await this.stepRepository.save([
      {
        name: 'Pre-Rinse',
        type: StepType.PRE_RINSE,
        order: 1,
        targetTemperature: 25,
        temperatureTolerance: 5,
        targetFlowRate: 5000,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 120,
        programTemplateVersionId: savedVersion2.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Alkaline Wash',
        type: StepType.CAUSTIC_WASH,
        order: 2,
        targetTemperature: 50,
        temperatureTolerance: 5,
        targetFlowRate: 5500,
        flowRateTolerance: 500,
        targetConductivity: 1000,
        conductivityTolerance: 200,
        holdTimeSeconds: 300,
        programTemplateVersionId: savedVersion2.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Final Rinse',
        type: StepType.FINAL_RINSE,
        order: 3,
        targetTemperature: 25,
        temperatureTolerance: 5,
        targetFlowRate: 5000,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 180,
        programTemplateVersionId: savedVersion2.id,
        failureStrategy: FailureStrategy.WAIT,
      },
    ]);
    templateVersions.push(savedVersion2);

    const template3 = this.programTemplateRepository.create({
      name: 'Heavy Soiling CIP - 70°C',
      description: 'Extended CIP for heavy soiling after long production runs',
      lineId,
    });
    const savedTemplate3 = await this.programTemplateRepository.save(template3);

    const version3 = this.versionRepository.create({
      programTemplateId: savedTemplate3.id,
      versionNumber: 1,
      changeDescription: 'Initial version',
    });
    const savedVersion3 = await this.versionRepository.save(version3);

    await this.stepRepository.save([
      {
        name: 'Pre-Rinse',
        type: StepType.PRE_RINSE,
        order: 1,
        targetTemperature: 35,
        temperatureTolerance: 5,
        targetFlowRate: 5500,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 300,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Alkaline Wash',
        type: StepType.CAUSTIC_WASH,
        order: 2,
        targetTemperature: 70,
        temperatureTolerance: 3,
        targetFlowRate: 6000,
        flowRateTolerance: 500,
        targetConductivity: 2000,
        conductivityTolerance: 300,
        holdTimeSeconds: 900,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Intermediate Rinse',
        type: StepType.INTERMEDIATE_RINSE,
        order: 3,
        targetTemperature: 35,
        temperatureTolerance: 5,
        targetFlowRate: 5500,
        flowRateTolerance: 500,
        targetConductivity: 200,
        conductivityTolerance: 50,
        holdTimeSeconds: 300,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Acid Wash',
        type: StepType.ACID_WASH,
        order: 4,
        targetTemperature: 65,
        temperatureTolerance: 3,
        targetFlowRate: 6000,
        flowRateTolerance: 500,
        targetConductivity: 1500,
        conductivityTolerance: 200,
        holdTimeSeconds: 600,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Final Rinse',
        type: StepType.FINAL_RINSE,
        order: 5,
        targetTemperature: 30,
        temperatureTolerance: 5,
        targetFlowRate: 5500,
        flowRateTolerance: 500,
        targetConductivity: 100,
        conductivityTolerance: 20,
        holdTimeSeconds: 360,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
      {
        name: 'Sanitization',
        type: StepType.SANITIZATION,
        order: 6,
        targetTemperature: 90,
        temperatureTolerance: 2,
        targetFlowRate: 4000,
        flowRateTolerance: 400,
        targetConductivity: 600,
        conductivityTolerance: 100,
        holdTimeSeconds: 480,
        programTemplateVersionId: savedVersion3.id,
        failureStrategy: FailureStrategy.WAIT,
      },
    ]);
    templateVersions.push(savedVersion3);

    return templateVersions;
  }

  private async createSampleJob(lineId: number, templateVersion: ProgramTemplateVersion): Promise<void> {
    const job = this.jobRepository.create({
      name: 'Morning CIP Run - Production Line A',
      description: 'Scheduled CIP after morning production shift',
      lineId,
      programTemplateId: templateVersion.programTemplateId,
      programTemplateVersionId: templateVersion.id,
      triggeredBy: 'system',
      status: JobStatus.COMPLETED,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      totalDurationSeconds: 3000,
    });
    const savedJob = await this.jobRepository.save(job);

    const steps = await this.stepRepository.find({
      where: { programTemplateVersionId: templateVersion.id },
      order: { order: 'ASC' },
    });

    const jobSteps: JobStep[] = [];
    let elapsedTime = 0;

    for (const step of steps) {
      const jobStep = this.jobStepRepository.create({
        jobId: savedJob.id,
        name: step.name,
        type: step.type,
        order: step.order,
        status: JobStepStatus.COMPLETED,
        targetTemperature: step.targetTemperature,
        temperatureTolerance: step.temperatureTolerance,
        targetFlowRate: step.targetFlowRate,
        flowRateTolerance: step.flowRateTolerance,
        targetConductivity: step.targetConductivity,
        conductivityTolerance: step.conductivityTolerance,
        holdTimeSeconds: step.holdTimeSeconds,
        elapsedSeconds: step.holdTimeSeconds,
        startTime: new Date(savedJob.startTime.getTime() + elapsedTime * 1000),
        endTime: new Date(savedJob.startTime.getTime() + (elapsedTime + step.holdTimeSeconds) * 1000),
        failureStrategy: step.failureStrategy,
        valveMatrix: step.valveMatrix,
        spcResult: {
          temperatureCompliant: true,
          flowRateCompliant: true,
          conductivityCompliant: true,
          overallCompliant: true,
        },
      });
      jobSteps.push(jobStep);
      elapsedTime += step.holdTimeSeconds;
    }

    await this.jobStepRepository.save(jobSteps);

    const measurements: Measurement[] = [];
    for (let i = 0; i < 300; i++) {
      const stepIndex = Math.floor(i / 50);
      const step = jobSteps[stepIndex];
      measurements.push(
        this.measurementRepository.create({
          jobId: savedJob.id,
          stepIndex,
          temperature: step.targetTemperature + (Math.random() - 0.5) * step.temperatureTolerance,
          flowRate: step.targetFlowRate + (Math.random() - 0.5) * step.flowRateTolerance,
          conductivity: step.targetConductivity + (Math.random() - 0.5) * step.conductivityTolerance,
          timestamp: new Date(savedJob.startTime.getTime() + i * 10000),
        }),
      );
    }

    await this.measurementRepository.save(measurements);
  }
}
