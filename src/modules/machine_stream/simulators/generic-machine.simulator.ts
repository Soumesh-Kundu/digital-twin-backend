import { BaseMachineSimulator, MachineData } from './base-machine.simulator';
import { ParamSimulator } from './param-simulator';
import { ParamPhase, ThresholdTransition } from './types/param-types';

export interface ParamAlertPayload {
  machineId: string;
  parameter: string;
  value: number;
  phase: ParamPhase;
  transition: ThresholdTransition;
  timestamp: number;
}

export class GenericMachineSimulator extends BaseMachineSimulator {
  private params = new Map<string, ParamSimulator>();

  constructor(
    machineId: string,
    thresholds: Record<string, number>,
    intervalMs = 1000,
    private readonly isParamResolved: (param: string) => boolean = () => false,
    private readonly onAlert?: (payload: ParamAlertPayload) => void,
  ) {
    super(machineId, intervalMs);

    for (const [name, max] of Object.entries(thresholds)) {
      this.params.set(name, new ParamSimulator(name, max));
    }
  }

  protected generateData(): MachineData {
    const now = Date.now();
    const metrics:MachineData["metrics"]= {};

    for (const [name, sim] of this.params) {
      const step = sim.step({
        maxThreshold: sim.maxThreshold,
        now,
        isAlarmResolved: this.isParamResolved(name),
      });

      metrics[name] = {
        value: step.value,
        phase: step.phase,
        transition: step.transition,
      };

       if (step.shouldCreateAlarm && this.onAlert) {
        this.onAlert({
          machineId: this.machineId,
          parameter: name,
          value: step.value,
          phase: step.phase,
          transition: step.transition,
          timestamp: now,
        });
      }
      // TODO: wire AlarmsService here using step.shouldCreateAlarm etc.
    }

    return {
      machineId: this.machineId,
      timestamp: new Date(now).toISOString(),
      state: 'ACTIVE',
      metrics,
    };
  }
}
