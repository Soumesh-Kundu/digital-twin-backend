// src/machine-stream/machine-stream.manager.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import { GenericMachineSimulator, ParamAlertPayload } from './simulators/generic-machine.simulator';
import { AlertsService } from '../alerts/alerts.service';
import { AlertType, MachinesStatus } from '@prisma/client';
import { MachineStatusChangedEvent } from '../machines/events/machine-status-changed.event';
import { MachinesService } from '../machines/machine.service';
import { AlertResolvedEvent } from '../alerts/events/alert-resolved.event';

interface MachineStreamEntry {
  simulator: GenericMachineSimulator;
  refCount: number;
  listener: (data: any) => void;
  resolvedParams: Map<string, boolean>;
  isPaused: boolean;
}

@Injectable()
export class MachineStreamManager {
  private streams = new Map<string, MachineStreamEntry>();
  private serverRef: Server | null = null;

  constructor(
    private readonly alertsService: AlertsService,
    private readonly machinesService: MachinesService,
  ) {}

  roomName(machineId: string) {
    return `machine:${machineId}`;
  }

  setServer(server: Server) {
    this.serverRef = server;
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
    // Store server reference for event handler
    this.serverRef = server;

    let entry = this.streams.get(machineId);
    if (entry) {
      entry.refCount++;
      // Resume if paused
      if (entry.isPaused) {
        entry.simulator.start();
        entry.isPaused = false;
      }
      return entry;
    }

    const resolvedParams = new Map<string, boolean>();

    const simulator = new GenericMachineSimulator(
      machineId,
      thresholds,
      1000,
      (param) => resolvedParams.get(param) ?? false,
      async (alert: ParamAlertPayload) => {
        // Format parameter name: snake_case or camelCase to Title Case
        // e.g., "spindle_speed" -> "Spindle Speed", "spindleSpeed" -> "Spindle Speed"
        // Also remove "max" or "Max" words from parameter name
        const formattedParam = alert.parameter
          .replace(/_?(max|Min)_?/gi, '') // Remove max/min words
          .replace(/_/g, ' ') // snake_case to spaces
          .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
          .split(' ')
          .filter(word => word.length > 0) // Remove empty strings
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        // 1) Create DB alert
        const message = `Parameter ${formattedParam} ${alert.phase === 'IN_BAND' ? 'exceeded' : 'approaching'} threshold with value ${alert.value.toFixed(
          2,
        )}`;

        // Determine alert type based on phase
        const alertType = alert.phase === 'IN_BAND' 
          ? AlertType.ERROR 
          : AlertType.WARNING;

        const created = await this.alertsService.createAlert({
          machineId,
          message,
          alertType,
        });

        // 2) Emit WebSocket alert to everyone subscribed to this machine room
        // Emit the same structure as DB response for consistency
        server.to(this.roomName(machineId)).emit('machine_alert', created);
      },
    );

    const listener = (data: any) => {
      server.to(this.roomName(machineId)).emit(`machine_update_${machineId}`, data);
    };

    simulator.on('data', listener);
    simulator.start();

    entry = {
      simulator,
      refCount: 1,
      listener,
      resolvedParams,
      isPaused: false,
    };

    this.streams.set(machineId, entry);
    return entry;
  }

  pauseStream(machineId: string) {
    const entry = this.streams.get(machineId);
    if (!entry || entry.isPaused) return;

    entry.simulator.stop();
    entry.isPaused = true;
    console.log(`Stream paused for machine: ${machineId}`);
  }

  resumeStream(machineId: string) {
    const entry = this.streams.get(machineId);
    if (!entry || !entry.isPaused) return;

    entry.simulator.start();
    entry.isPaused = false;
    console.log(`Stream resumed for machine: ${machineId}`);
  }

  @OnEvent('machine.status.changed')
  async handleMachineStatusChange(event: MachineStatusChangedEvent) {
    const { machineId, oldStatus, newStatus } = event;
    console.log(`Machine ${machineId} status changed: ${oldStatus} -> ${newStatus}`);

    const entry = this.streams.get(machineId);
    
    // If no active stream for this machine, nothing to do
    if (!entry) {
      // But if machine became ACTIVE and there are subscribers, start stream
      if (newStatus === MachinesStatus.ACTIVE && this.serverRef) {
        const room = this.serverRef.sockets.adapter.rooms.get(this.roomName(machineId));
        if (room && room.size > 0) {
          const thresholds = await this.machinesService.getMetricsThresholds(machineId);
          this.ensureStream(machineId, thresholds, this.serverRef);
        }
      }
      return;
    }

    // Machine became ACTIVE - resume stream
    if (newStatus === MachinesStatus.ACTIVE) {
      this.resumeStream(machineId);
      // Notify subscribers about status change
      if (this.serverRef) {
        this.serverRef.to(this.roomName(machineId)).emit(`machine_status_${machineId}`, {
          machineId,
          status: newStatus,
          streaming: true,
        });
      }
    } 
    // Machine became IDLE or MAINTENANCE - pause stream
    else {
      this.pauseStream(machineId);
      // Notify subscribers about status change
      if (this.serverRef) {
        this.serverRef.to(this.roomName(machineId)).emit(`machine_status_${machineId}`, {
          machineId,
          status: newStatus,
          streaming: false,
        });
      }
    }
  }

  @OnEvent('alert.resolved')
  handleAlertResolved(event: AlertResolvedEvent) {
    const { machineId, parameter } = event;
    console.log(`Alert resolved for machine ${machineId}, parameter: ${parameter}`);
    
    // Mark the parameter as resolved so simulator transitions to cooldown
    this.markAlarmResolved(machineId, parameter);
  }

  releaseStream(machineId: string, server: Server) {
    const entry = this.streams.get(machineId);
    if (!entry) return;

    entry.refCount--;
    const room = server.sockets.adapter.rooms.get(this.roomName(machineId));
    const roomSize = room?.size ?? 0;

    console.log(`Releasing stream for machine: ${machineId}, refCount: ${entry.refCount}, roomSize: ${roomSize}`);
    if (entry.refCount <= 0 || roomSize === 0) {
      console.log(`Stopping and removing stream for machine: ${machineId}`);
      entry.simulator.off('data', entry.listener);
      entry.simulator.stop();
      this.streams.delete(machineId);
    }
  }
}
