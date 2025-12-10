import { EventEmitter } from 'events';
import { ParamPhase, ThresholdTransition } from './types/param-types';

export interface MachineData {
  machineId: string;
  timestamp: string;
  state: 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'FAULT';
  metrics: Record<string, {
    value: number;
    phase: ParamPhase;
    transition: ThresholdTransition;
  }>;
}

export abstract class BaseMachineSimulator extends EventEmitter {
  protected timer?: NodeJS.Timeout;

  constructor(
    public readonly machineId: string,
    private readonly intervalMs: number = 1000,
  ) {
    super();
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const data = this.generateData();
      this.emit('data', data);
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  protected abstract generateData(): MachineData;
}
