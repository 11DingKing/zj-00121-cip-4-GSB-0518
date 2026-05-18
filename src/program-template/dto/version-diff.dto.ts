export enum ChangeType {
  ADDED = 'added',
  REMOVED = 'removed',
  MODIFIED = 'modified',
}

export interface StepDiff {
  stepName: string;
  changeType: ChangeType;
  changes: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface VersionDiffResult {
  versionAId: number;
  versionBId: number;
  versionANumber: number;
  versionBNumber: number;
  stepDiffs: StepDiff[];
  summary: {
    addedSteps: number;
    removedSteps: number;
    modifiedSteps: number;
  };
}
