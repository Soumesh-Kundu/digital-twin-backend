import { MachinesStatus } from '@prisma/client';

export class MachineStatusChangedEvent {
  constructor(
    public readonly machineId: string,
    public readonly oldStatus: MachinesStatus,
    public readonly newStatus: MachinesStatus,
  ) {}
}
