// src/alerts/alerts.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from 'src/services/db';
import { AlertStatus, AlertType } from '@prisma/client';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import { UpdateAlertStatusDto } from './dto/alerts.dto';
import { AlertResolvedEvent } from './events/alert-resolved.event';

export interface CreateAlertInput {
  machineId: string;
  message: string;
  alertType: AlertType;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get recent alerts for admin users (no assignment filter)
   */
  async getRecentAlertsForAdmin(limit: number = 5) {
    try {
      const [items, pendingCount] = await this.db.$transaction([
        this.db.alerts.findMany({
          orderBy: { createdAt: 'desc' },
          take: limit,
          include: {
            machine: {
              select: { id: true, name: true, model_name: true },
            },
            resolvedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.db.alerts.count({
          where: { status: AlertStatus.PENDING },
        }),
      ]);

      return {
        data: items,
        meta: {
          page: 1,
          pageSize: limit,
          total: items.length,
          totalPages: 1,
          pending: pendingCount,
        },
      };
    } catch (error) {
      console.error('Error fetching alerts for admin:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async createAlert(input: CreateAlertInput) {
    try {
      const alert = await this.db.alerts.create({
        data: {
          machineId: input.machineId,
          message: input.message,
          alertType: input.alertType,
          status: AlertStatus.PENDING,
        },
        include: {
          machine: {
            select: { id: true, name: true, model_name: true },
          },
          resolvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  /**
   * Get paginated alerts for a given user:
   * - Alerts for machines where the user is assigned
   * - Optionally filtered by status
   */
  async getAlertsForUser(
    userId: string,
    query: GetAlertsQueryDto,
  ) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const skip = (page - 1) * pageSize;

    const where: any = {
      machine: {
        assignments: {
          some: {
            userId,
          },
        },
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    try {
      const [items, total,pendings] = await this.db.$transaction([
        this.db.alerts.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
          include: {
            machine: {
              select: { id: true, name: true, model_name: true },
            },
            resolvedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        this.db.alerts.count({ where }),
        this.db.alerts.count({
          where:{
            ...where,
            status: AlertStatus.PENDING
          }
        })
      ]);

      return {
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          pending: pendings,
        },
      };
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  /**
   * Mark an alert as RESOLVED / UNRESOLVED / PENDING
   * and optionally store a reason. Uses the current user
   * as resolvedBy.
   */
  async updateAlertStatus(
    alertId: string,
    userId: string,
    dto: UpdateAlertStatusDto,
  ) {
    const alert = await this.db.alerts.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException({ message: 'Alert not found' });
    }

    const data: any = {
      status: dto.status,
      reason: dto.reason ?? alert.reason,
    };

    // If status is final (RESOLVED or UNRESOLVED), set resolvedBy + resolvedAt
    if (
      dto.status === AlertStatus.RESOLVED ||
      dto.status === AlertStatus.UNRESOLVED
    ) {
      data.resolvedById = userId;
      data.resolvedAt = new Date();
    }

    try {
      const updated = await this.db.alerts.update({
        where: { id: alertId },
        data,
      });

      // Emit event when alert is resolved to trigger cooldown
      if (dto.status === AlertStatus.RESOLVED) {
        // Extract parameter name from message (e.g., "Parameter temperature exceeded threshold...")
        const paramMatch = alert.message.match(/Parameter (\w+)/i);
        const paramName = paramMatch ? paramMatch[1] : '';
        
        if (paramName) {
          this.eventEmitter.emit(
            'alert.resolved',
            new AlertResolvedEvent(
              alertId,
              alert.machineId,
              alert.message,
              paramName,
            ),
          );
        }
      }

      return {
        message: 'Alert status updated successfully',
        alert: updated,
      };
    } catch (error) {
      console.error('Error updating alert status:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }
}
