// src/alerts/alerts.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/services/db';
import { AlertStatus, AlertType } from '@prisma/client';
import { GetAlertsQueryDto } from './dto/alerts.dto';
import { UpdateAlertStatusDto } from './dto/alerts.dto';

export interface CreateAlertInput {
  machineId: string;
  message: string;
  alertType: AlertType;
}

@Injectable()
export class AlertsService {
  constructor(private readonly db: DatabaseService) { }

  async createAlert(input: CreateAlertInput) {
    try {
      const alert = await this.db.alerts.create({
        data: {
          machineId: input.machineId,
          message: input.message,
          alertType: input.alertType,
          status: AlertStatus.PENDING,
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
      const [items, total] = await this.db.$transaction([
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
      ]);

      return {
        data: items,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
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
