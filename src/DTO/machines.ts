import { MACHINE_TYPE, MachinesStatus } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";

export class MachineDTO {
    name: string;
    model_name: string
    type: MACHINE_TYPE;
    status: MachinesStatus;
    temperature_max: number;
    vibration_max: number;
    power_max: number;
    thresholds: JsonValue;
}