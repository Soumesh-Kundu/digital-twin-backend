import {
  ParamContext,
  ParamPhase,
  ParamStepResult,
} from './types/param-types';
import { ParamHistory, classifyThresholdTransition } from './param-history';
import { randomBetween, randomStep } from './utils/random';

const HOLD_IN_BAND_MIN_MS = 10_000;
const AUTO_COOL_AFTER_MS = 30_000;
const RESOLVED_EXTRA_HOLD_MS = 5_000;

export class ParamSimulator {
  readonly name: string;
  readonly maxThreshold: number;

  private value: number;
  private phase: ParamPhase = 'NORMAL';
  private history = new ParamHistory();

  private alarmStartTime: number | null = null;
  private resolvedAt: number | null = null;

  constructor(name: string, maxThreshold: number) {
    this.name = name;
    this.maxThreshold = maxThreshold;

    const factor = randomBetween(0.5, 0.6);
    this.value = factor * maxThreshold;
    this.history.push(this.value);
  }

  step(ctx: ParamContext): ParamStepResult {
    const { maxThreshold, now, isAlarmResolved } = ctx;

    const APPROACH_START = 0.8 * maxThreshold;
    const BAND_LOW = 0.95 * maxThreshold;

    const stepMax = maxThreshold * 0.01;

    let pUp = 0.5;
    if (this.phase === 'APPROACHING') pUp = 0.6;
    if (this.phase === 'COOLDOWN') pUp = 0.4;

    let next = randomStep(this.value, stepMax, pUp);
    if (next < 0) next = 0;
    if (next > maxThreshold * 1.2) next = maxThreshold * 1.2;

    this.value = next;
    this.history.push(next);

    const transition = classifyThresholdTransition(this.history, BAND_LOW);

    let shouldCreateAlarm = false;
    let alarmShouldClear = false;

    switch (this.phase) {
      case 'NORMAL':
        if (next >= APPROACH_START) this.phase = 'APPROACHING';
        if (transition === 'ENTERING') {
          this.phase = 'IN_BAND';
          shouldCreateAlarm = true;
          this.alarmStartTime = now;
        }
        break;

      case 'APPROACHING':
        if (transition === 'ENTERING') {
          this.phase = 'IN_BAND';
          shouldCreateAlarm = true;
          this.alarmStartTime = now;
        }
        break;

      case 'IN_BAND':
        if (isAlarmResolved && !this.resolvedAt) {
          this.resolvedAt = now;
        }

        if (!isAlarmResolved && this.alarmStartTime && now - this.alarmStartTime > AUTO_COOL_AFTER_MS) {
          this.phase = 'COOLDOWN';
        }

        if (this.resolvedAt && now - this.resolvedAt > RESOLVED_EXTRA_HOLD_MS) {
          this.phase = 'COOLDOWN';
        }

        if (transition === 'LEAVING') {
          alarmShouldClear = true;
          this.phase = 'COOLDOWN';
        }
        break;

      case 'COOLDOWN':
        if (next < APPROACH_START) {
          alarmShouldClear = true;
          this.phase = 'NORMAL';
        }
        break;
    }

    return {
      value: this.value,
      phase: this.phase,
      transition,
      shouldCreateAlarm,
      alarmShouldClear,
    };
  }
}
