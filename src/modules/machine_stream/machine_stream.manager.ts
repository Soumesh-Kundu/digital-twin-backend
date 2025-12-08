// src/machine-stream/machine-stream.manager.ts

import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { GenericMachineSimulator, ParamAlertPayload } from './simulators/generic-machine.simulator';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType } from '@prisma/client';

interface MachineStreamEntry {
  simulator: GenericMachineSimulator;
  refCount: number;
  listener: (data: any) => void;
  resolvedParams: Map<string, boolean>;
}

@Injectable()
export class MachineStreamManager {
  private streams = new Map<string, MachineStreamEntry>();

  constructor(private readonly alertsService: AlertsService) {}

  roomName(machineId: string) {
    return `machine:${machineId}`;
  }

  markAlarmResolved(machineId: string, paramName: string) {
    const entry = this.streams.get(machineId);
    if (!entry) return;
    entry.resolvedParams.set(paramName, true);
  }

  ensureStream(
    machineId: string,
    thresholds: Record<string, number>,
    server: Server,
  ) {
    let entry = this.streams.get(machineId);
    if (entry) {
      entry.refCount++;
      return entry;
    }

    const resolvedParams = new Map<string, boolean>();

    const simulator = new GenericMachineSimulator(
      machineId,
      thresholds,
      1000,
      (param) => resolvedParams.get(param) ?? false,
      async (alert: ParamAlertPayload) => {
        // 1) Create DB alert
        const message = `Parameter ${alert.parameter} crossed threshold with value ${alert.value.toFixed(
          2,
        )}`;

        const created = await this.alertsService.createAlert({
          machineId,
          message,
          alertType: AlertType.WARNING, // you can change logic to ERROR later
        });

        // 2) Emit WebSocket alert to everyone subscribed to this machine room
        const payload = {
          id: created.id,
          machineId,
          alertType: created.alertType,
          status: created.status,
          message: created.message,
          createdAt: created.createdAt,
          parameter: alert.parameter,
          value: alert.value,
          phase: alert.phase,
          transition: alert.transition,
          timestamp: new Date(alert.timestamp).toISOString(),
        };

        server.to(this.roomName(machineId)).emit('machine_alert', payload);
      },
    );

    const listener = (data: any) => {
      server.to(this.roomName(machineId)).emit('machine_update', data);
    };

    simulator.on('data', listener);
    simulator.start();

    entry = {
      simulator,
      refCount: 1,
      listener,
      resolvedParams,
    };

    this.streams.set(machineId, entry);
    return entry;
  }

  releaseStream(machineId: string, server: Server) {
    const entry = this.streams.get(machineId);
    if (!entry) return;

    entry.refCount--;
    const room = server.sockets.adapter.rooms.get(this.roomName(machineId));
    const roomSize = room?.size ?? 0;

    if (entry.refCount <= 0 || roomSize === 0) {
      entry.simulator.off('data', entry.listener);
      entry.simulator.stop();
      this.streams.delete(machineId);
    }
  }
}
