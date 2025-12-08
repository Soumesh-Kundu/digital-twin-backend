
import { Module } from '@nestjs/common';
import { MachineStreamManager } from './machine_stream.manager';
import { MachinesGateway } from './machines.gateway';
import { MachinesModule } from '../machines/machine.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [MachinesModule, AlertsModule],
  providers: [MachineStreamManager, MachinesGateway],
  exports: [MachineStreamManager],
})
export class MachineStreamModule {}
