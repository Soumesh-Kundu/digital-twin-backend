// src/machines/machines.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from 'src/services/db';
import { MachineDTO } from './dto/machine.dto';
import { JsonValue } from '@prisma/client/runtime/library';
import { MachineStatusChangedEvent } from './events/machine-status-changed.event';

@Injectable()
export class MachinesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll() {
    try {
      return await this.db.machines.findMany({
        orderBy: { createdAt: 'asc' },
        include:{
          _count:{
            select:{
              assignments:true
            }
          }
        },
      });
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async create(data: MachineDTO) {
    try {
      const machine = await this.db.machines.create({
        data: {
          name: data.name,
          model_name: data.model_name,
          type: data.type,
          status: data.status,
          power_max: data.power_max,
          temperature_max: data.temperature_max,
          vibration_max: data.vibration_max,
          thresholds: (data.thresholds ?? {}) as JsonValue,
        },
      });
      return machine;
    } catch (error) {
      console.error('Error creating machine:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async update(id: string, data: MachineDTO) {
    try {
      // Get current machine to check for status change
      const currentMachine = await this.db.machines.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!currentMachine) {
        throw new NotFoundException({ message: 'Machine not found' });
      }

      const oldStatus = currentMachine.status;

      await this.db.machines.update({
        where: { id },
        data: {
          name: data.name,
          model_name: data.model_name,
          type: data.type,
          status: data.status,
          power_max: data.power_max,
          temperature_max: data.temperature_max,
          vibration_max: data.vibration_max,
          thresholds: (data.thresholds ?? {}) as JsonValue,
        },
      });

      // Emit event if status changed
      if (oldStatus !== data.status) {
        this.eventEmitter.emit(
          'machine.status.changed',
          new MachineStatusChangedEvent(id, oldStatus, data.status),
        );
      }

      return { message: 'Machine updated successfully' };
    } catch (error) {
      console.error('Error updating machine:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async delete(id: string) {
    try {
      await this.ensureExists(id);

      await this.db.machines.delete({
        where: { id },
      });

      return { message: 'Machine deleted successfully' };
    } catch (error) {
      console.error('Error deleting machine:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async findById(id: string) {
    const machine = await this.db.machines.findUnique({
      where: { id },
    });

    if (!machine) {
      throw new NotFoundException({ message: 'Machine not found' });
    }

    return machine;
  }

  private async ensureExists(id: string) {
    const machine = await this.db.machines.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!machine) {
      throw new NotFoundException({ message: 'Machine not found' });
    }
  }

  /**
   * Used by MachineStreamManager to get all metric max values
   * for synthetic data generation.
   *
   * Returns a map like:
   * {
   *   temperature: 80,
   *   vibration: 2.5,
   *   power: 15,
   *   ...extra from thresholds JSON
   * }
   */
  async getMetricsThresholds(
    machineId: string,
  ): Promise<Record<string, number>> {
    const machine = await this.db.machines.findUnique({
      where: { id: machineId },
      select: {
        temperature_max: true,
        vibration_max: true,
        power_max: true,
        thresholds: true,
      },
    });

    if (!machine) {
      throw new NotFoundException({ message: 'Machine not found' });
    }

    const base: Record<string, number> = {
      temperature: machine.temperature_max,
      vibration: machine.vibration_max,
      power: machine.power_max,
    };

    const extra = (machine.thresholds ?? {}) as Record<string, unknown>;
    console.log('extra thresholds:', extra);

    for (const [key, value] of Object.entries(extra)) {
      base[key] = parseInt(value as string);
    }
    console.log('Compiled metrics thresholds:', base);

    return base;
  }
}
