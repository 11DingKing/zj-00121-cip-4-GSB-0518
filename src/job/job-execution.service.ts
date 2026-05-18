import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './entities/job.entity';
import { JobStep, JobStepStatus } from './entities/job-step.entity';
import { Measurement } from './entities/measurement.entity';
import { Alarm, AlarmType, AlarmSeverity, AlarmStatus } from '../alarm/entities/alarm.entity';
import { AuditEvent, EventType } from '../audit/entities/audit-event.entity';
import { FailureStrategy } from '../program-template/entities/step.entity';
import { createHmac } from 'crypto';

interface RunningJob {
  jobId: number;
  intervalId: NodeJS.Timeout;
  currentStepIndex: number;
}

@Injectable()
export class JobExecutionService implements OnModuleDestroy {
  private runningJobs: Map<number, RunningJob> = new Map();

  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobStep)
    private jobStepRepository: Repository<JobStep>,
    @InjectRepository(Measurement)
    private measurementRepository: Repository<Measurement>,
    @InjectRepository(Alarm)
    private alarmRepository: Repository<Alarm>,
    @InjectRepository(AuditEvent)
    private auditEventRepository: Repository<AuditEvent>,
  ) {}

  onModuleDestroy() {
    this.runningJobs.forEach((job) => clearInterval(job.intervalId));
    this.runningJobs.clear();
  }

  async startJob(jobId: number): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['jobSteps'],
    });

    if (!job) {
      throw new Error(`Job #${jobId} not found`);
    }

    if (job.status === JobStatus.RUNNING) {
      throw new Error(`Job #${jobId} is already running`);
    }

    job.status = JobStatus.RUNNING;
    job.startTime = new Date();
    job.currentStepIndex = 0;
    await this.jobRepository.save(job);

    await this.createAuditEvent(EventType.JOB_STARTED, jobId, `Job started: ${job.name}`, {
      jobName: job.name,
      startTime: job.startTime,
    });

    await this.startStep(jobId, 0);

    const intervalId = setInterval(() => this.executeTick(jobId), 1000);
    this.runningJobs.set(jobId, { jobId, intervalId, currentStepIndex: 0 });

    return job;
  }

  private async startStep(jobId: number, stepIndex: number): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['jobSteps'],
    });

    if (!job) return;

    const sortedSteps = job.jobSteps.sort((a, b) => a.order - b.order);
    const step = sortedSteps[stepIndex];

    if (!step) {
      await this.completeJob(jobId);
      return;
    }

    step.status = JobStepStatus.RUNNING;
    step.startTime = new Date();
    step.elapsedSeconds = 0;
    await this.jobStepRepository.save(step);

    job.currentStepIndex = stepIndex;
    await this.jobRepository.save(job);

    await this.createAuditEvent(EventType.STEP_STARTED, jobId, `Step started: ${step.name}`, {
      stepName: step.name,
      stepIndex,
      stepType: step.type,
    });
  }

  private async executeTick(jobId: number): Promise<void> {
    const runningJob = this.runningJobs.get(jobId);
    if (!runningJob) return;

    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['jobSteps'],
    });

    if (!job || job.status !== JobStatus.RUNNING) {
      this.stopJobInterval(jobId);
      return;
    }

    const sortedSteps = job.jobSteps.sort((a, b) => a.order - b.order);
    const step = sortedSteps[job.currentStepIndex];

    if (!step) {
      await this.completeJob(jobId);
      return;
    }

    step.elapsedSeconds += 1;

    const temperature = this.simulateValue(step.targetTemperature, step.temperatureTolerance, 2);
    const flowRate = this.simulateValue(step.targetFlowRate, step.flowRateTolerance, 5);
    const conductivity = this.simulateValue(step.targetConductivity, step.conductivityTolerance, 10);

    const measurement = this.measurementRepository.create({
      jobId,
      stepIndex: job.currentStepIndex,
      temperature,
      flowRate,
      conductivity,
      timestamp: new Date(),
    });
    await this.measurementRepository.save(measurement);

    await this.checkAndCreateAlarms(job, step, temperature, flowRate, conductivity);

    const complianceResult = this.checkSPCCompliance(step, temperature, flowRate, conductivity);

    if (step.elapsedSeconds >= step.holdTimeSeconds) {
      if (complianceResult.overallCompliant) {
        await this.completeStep(job, step, sortedSteps, complianceResult);
      } else {
        await this.handleStepFailure(job, step, sortedSteps, complianceResult);
      }
    } else {
      await this.jobStepRepository.save(step);
    }
  }

  private simulateValue(target: number, tolerance: number, noiseLevel: number): number {
    const noise = (Math.random() - 0.5) * noiseLevel;
    const drift = (Math.random() - 0.5) * tolerance * 1.5;
    
    if (Math.random() < 0.15) {
      const direction = Math.random() < 0.5 ? -1 : 1;
      return target + direction * (tolerance + Math.random() * noiseLevel);
    }
    
    return target + noise + drift;
  }

  private async checkAndCreateAlarms(
    job: Job,
    step: JobStep,
    temperature: number,
    flowRate: number,
    conductivity: number,
  ): Promise<void> {
    const alarms: Alarm[] = [];

    if (temperature > step.targetTemperature + step.temperatureTolerance) {
      alarms.push(
        this.alarmRepository.create({
          jobId: job.id,
          stepIndex: job.currentStepIndex,
          type: AlarmType.TEMPERATURE_HIGH,
          severity: AlarmSeverity.WARNING,
          status: AlarmStatus.ACTIVE,
          message: `Temperature too high: ${temperature.toFixed(2)}°C`,
          details: {
            value: temperature,
            target: step.targetTemperature,
            tolerance: step.temperatureTolerance,
          },
          timestamp: new Date(),
        }),
      );
    } else if (temperature < step.targetTemperature - step.temperatureTolerance) {
      alarms.push(
        this.alarmRepository.create({
          jobId: job.id,
          stepIndex: job.currentStepIndex,
          type: AlarmType.TEMPERATURE_LOW,
          severity: AlarmSeverity.WARNING,
          status: AlarmStatus.ACTIVE,
          message: `Temperature too low: ${temperature.toFixed(2)}°C`,
          details: {
            value: temperature,
            target: step.targetTemperature,
            tolerance: step.temperatureTolerance,
          },
          timestamp: new Date(),
        }),
      );
    }

    if (flowRate > step.targetFlowRate + step.flowRateTolerance) {
      alarms.push(
        this.alarmRepository.create({
          jobId: job.id,
          stepIndex: job.currentStepIndex,
          type: AlarmType.FLOW_RATE_HIGH,
          severity: AlarmSeverity.WARNING,
          status: AlarmStatus.ACTIVE,
          message: `Flow rate too high: ${flowRate.toFixed(2)} L/min`,
          details: {
            value: flowRate,
            target: step.targetFlowRate,
            tolerance: step.flowRateTolerance,
          },
          timestamp: new Date(),
        }),
      );
    } else if (flowRate < step.targetFlowRate - step.flowRateTolerance) {
      alarms.push(
        this.alarmRepository.create({
          jobId: job.id,
          stepIndex: job.currentStepIndex,
          type: AlarmType.FLOW_RATE_LOW,
          severity: AlarmSeverity.WARNING,
          status: AlarmStatus.ACTIVE,
          message: `Flow rate too low: ${flowRate.toFixed(2)} L/min`,
          details: {
            value: flowRate,
            target: step.targetFlowRate,
            tolerance: step.flowRateTolerance,
          },
          timestamp: new Date(),
        }),
      );
    }

    if (alarms.length > 0) {
      await this.alarmRepository.save(alarms);
      for (const alarm of alarms) {
        await this.createAuditEvent(EventType.ALARM_TRIGGERED, job.id, alarm.message, {
          alarmId: alarm.id,
          alarmType: alarm.type,
          severity: alarm.severity,
        });
      }
    }
  }

  private checkSPCCompliance(
    step: JobStep,
    temperature: number,
    flowRate: number,
    conductivity: number,
  ): {
    temperatureCompliant: boolean;
    flowRateCompliant: boolean;
    conductivityCompliant: boolean;
    overallCompliant: boolean;
  } {
    const temperatureCompliant =
      temperature >= step.targetTemperature - step.temperatureTolerance &&
      temperature <= step.targetTemperature + step.temperatureTolerance;

    const flowRateCompliant =
      flowRate >= step.targetFlowRate - step.flowRateTolerance &&
      flowRate <= step.targetFlowRate + step.flowRateTolerance;

    const conductivityCompliant =
      conductivity >= step.targetConductivity - step.conductivityTolerance &&
      conductivity <= step.targetConductivity + step.conductivityTolerance;

    return {
      temperatureCompliant,
      flowRateCompliant,
      conductivityCompliant,
      overallCompliant: temperatureCompliant && flowRateCompliant && conductivityCompliant,
    };
  }

  private async handleStepFailure(
    job: Job,
    step: JobStep,
    sortedSteps: JobStep[],
    complianceResult: {
      temperatureCompliant: boolean;
      flowRateCompliant: boolean;
      conductivityCompliant: boolean;
      overallCompliant: boolean;
    },
  ): Promise<void> {
    step.spcResult = complianceResult;

    switch (step.failureStrategy) {
      case FailureStrategy.WAIT:
        await this.createAuditEvent(EventType.STEP_WAITING, job.id, `Step waiting for compliance: ${step.name}`, {
          stepName: step.name,
          stepIndex: job.currentStepIndex,
          complianceResult,
        });
        step.elapsedSeconds = step.holdTimeSeconds - 5;
        await this.jobStepRepository.save(step);
        break;

      case FailureStrategy.RETRY:
        if (step.retryCount < step.maxRetries) {
          step.retryCount += 1;
          step.elapsedSeconds = 0;
          await this.createAuditEvent(EventType.STEP_RETRY, job.id, `Step retry #${step.retryCount}: ${step.name}`, {
            stepName: step.name,
            stepIndex: job.currentStepIndex,
            retryCount: step.retryCount,
            maxRetries: step.maxRetries,
          });
          await this.jobStepRepository.save(step);
        } else {
          await this.failStep(job, step, sortedSteps, 'Max retries exceeded');
        }
        break;

      case FailureStrategy.ABORT:
        await this.failStep(job, step, sortedSteps, 'Aborted on failure');
        break;

      default:
        await this.jobStepRepository.save(step);
    }
  }

  private async failStep(job: Job, step: JobStep, sortedSteps: JobStep[], reason: string): Promise<void> {
    step.status = JobStepStatus.FAILED;
    step.endTime = new Date();
    await this.jobStepRepository.save(step);

    await this.createAuditEvent(EventType.STEP_FAILED, job.id, `Step failed: ${step.name} - ${reason}`, {
      stepName: step.name,
      stepIndex: job.currentStepIndex,
      reason,
    });

    this.stopJobInterval(job.id);

    job.status = JobStatus.FAILED;
    job.endTime = new Date();
    if (job.startTime) {
      job.totalDurationSeconds = Math.floor((job.endTime.getTime() - job.startTime.getTime()) / 1000);
    }
    await this.jobRepository.save(job);

    await this.createAuditEvent(EventType.JOB_FAILED, job.id, `Job failed: ${job.name}`, {
      jobName: job.name,
      reason,
    });
  }

  private async completeStep(
    job: Job,
    step: JobStep,
    sortedSteps: JobStep[],
    complianceResult: {
      temperatureCompliant: boolean;
      flowRateCompliant: boolean;
      conductivityCompliant: boolean;
      overallCompliant: boolean;
    },
  ): Promise<void> {
    step.status = JobStepStatus.COMPLETED;
    step.endTime = new Date();
    step.spcResult = complianceResult;
    await this.jobStepRepository.save(step);

    await this.createAuditEvent(EventType.STEP_COMPLETED, job.id, `Step completed: ${step.name}`, {
      stepName: step.name,
      stepIndex: job.currentStepIndex,
      duration: step.elapsedSeconds,
    });

    const nextStepIndex = job.currentStepIndex + 1;
    if (nextStepIndex < sortedSteps.length) {
      await this.startStep(job.id, nextStepIndex);
    } else {
      await this.completeJob(job.id);
    }
  }

  private async completeJob(jobId: number): Promise<void> {
    this.stopJobInterval(jobId);

    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) return;

    job.status = JobStatus.COMPLETED;
    job.endTime = new Date();
    job.totalDurationSeconds = Math.floor(
      (job.endTime.getTime() - job.startTime.getTime()) / 1000,
    );
    await this.jobRepository.save(job);

    await this.createAuditEvent(EventType.JOB_COMPLETED, jobId, `Job completed: ${job.name}`, {
      jobName: job.name,
      duration: job.totalDurationSeconds,
      endTime: job.endTime,
    });
  }

  async abortJob(jobId: number, reason?: string): Promise<Job> {
    this.stopJobInterval(jobId);

    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new Error(`Job #${jobId} not found`);
    }

    job.status = JobStatus.ABORTED;
    job.endTime = new Date();
    if (job.startTime) {
      job.totalDurationSeconds = Math.floor((job.endTime.getTime() - job.startTime.getTime()) / 1000);
    }
    await this.jobRepository.save(job);

    await this.createAuditEvent(EventType.JOB_ABORTED, jobId, `Job aborted: ${job.name}`, {
      jobName: job.name,
      reason,
    });

    return job;
  }

  private stopJobInterval(jobId: number): void {
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      clearInterval(runningJob.intervalId);
      this.runningJobs.delete(jobId);
    }
  }

  private async createAuditEvent(
    eventType: EventType,
    jobId: number,
    message: string,
    details: Record<string, any>,
  ): Promise<void> {
    const lastEvent = await this.auditEventRepository.findOne({
      where: { jobId },
      order: { id: 'DESC' },
    });

    const timestamp = new Date();
    const hashInput = `${eventType}-${jobId}-${timestamp.toISOString()}-${JSON.stringify(details)}-${lastEvent?.hash || ''}`;
    const hash = createHmac('sha256', 'cip-audit-secret-key').update(hashInput).digest('hex');

    const auditEvent = this.auditEventRepository.create({
      eventType,
      jobId,
      message,
      details,
      timestamp,
      previousHash: lastEvent?.hash,
      hash,
    });

    await this.auditEventRepository.save(auditEvent);
  }

  isJobRunning(jobId: number): boolean {
    return this.runningJobs.has(jobId);
  }
}
