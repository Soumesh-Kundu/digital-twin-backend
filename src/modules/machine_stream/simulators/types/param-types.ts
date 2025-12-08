export type ParamPhase =
  | 'NORMAL'
  | 'APPROACHING'
  | 'IN_BAND'
  | 'COOLDOWN';

export type ThresholdTransition =
  | 'ENTERING'
  | 'STAYING'
  | 'LEAVING'
  | 'BELOW';

export interface ParamContext {
  maxThreshold: number;
  now: number;
  isAlarmResolved: boolean;
}

export interface ParamStepResult {
  value: number;
  phase: ParamPhase;
  transition: ThresholdTransition;
  shouldCreateAlarm: boolean;
  alarmShouldClear: boolean;
}
