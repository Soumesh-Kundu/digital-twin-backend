export class AlertResolvedEvent {
  constructor(
    public readonly alertId: string,
    public readonly machineId: string,
    public readonly message: string,
    public readonly parameter: string,
  ) {}
}
