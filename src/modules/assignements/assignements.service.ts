// src/assignments/assignments.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from 'src/services/db';
import { UpdateAssignmentsDTO } from './dto/update-assignements.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly db: DatabaseService) {}

  // ----------------- existing method -----------------
  async updateAssignments(body: UpdateAssignmentsDTO) {
    try {
      const { machineId, userId } = body;

      const existingAssignments = await this.db.machine_Assignments.findMany({
        where: { machineId },
      });

      const toAdd = userId.filter(
        (id) => !existingAssignments.some((assignment) => assignment.userId === id),
      );

      const toRemove = existingAssignments
        .filter((assignment) => !userId.includes(assignment.userId))
        .map((assignment) => assignment.id);

      await this.db.$transaction([
        this.db.machine_Assignments.deleteMany({
          where: { id: { in: toRemove } },
        }),
        this.db.machine_Assignments.createMany({
          data: toAdd.map((uid) => ({
            machineId,
            userId: uid,
          })),
        }),
      ]);

      return { message: 'Assignments updated successfully' };
    } catch (error) {
      console.log('Error updating assignments:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  // ----------------- NEW: 1) all machines with assignees -----------------
  async getAllMachinesWithAssignees() {
    try {
      const machines = await this.db.machines.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // shape result: each machine with assigned users {id, name}
      return machines.map((m) => ({
        id: m.id,
        name: m.name,
        model_name: m.model_name,
        type: m.type,
        status: m.status,
        assignees: m.assignments.map((a) => ({
          id: a.user.id,
          name: a.user.name,
        })),
      }));
    } catch (error) {
      console.log('Error fetching machines with assignees:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  // ----------------- NEW: 2) machines for a specific user -----------------
  async getMachinesForUser(userId: string) {
    try {
      const assignments = await this.db.machine_Assignments.findMany({
        where: { userId },
        orderBy: { assignedAt: 'desc' },
        include: {
          machine: true,
        },
      });

      // unique machines (in case of multiple assignments history)
      const seen = new Set<string>();
      const machines: {
        id: string;
        name: string;
        model_name: string;
        type: string;
        status: string;
      }[] = [];

      for (const a of assignments) {
        if (!a.machine) continue;
        if (seen.has(a.machine.id)) continue;
        seen.add(a.machine.id);

        machines.push({
          id: a.machine.id,
          name: a.machine.name,
          model_name: a.machine.model_name,
          type: a.machine.type,
          status: a.machine.status,
        });
      }

      return machines;
    } catch (error) {
      console.log('Error fetching machines for user:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  // ----------------- NEW: 3) recent assignees with machine + user info -----------------
  async getRecentAssignments(limit = 10) {
    try {
      const recent = await this.db.machine_Assignments.findMany({
        orderBy: { assignedAt: 'desc' },
        take: limit,
        include: {
          machine: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Ensure shape: machine name + type + user name (+ ids if needed)
      return recent.map((a) => ({
        id: a.id,
        assignedAt: a.assignedAt,
        machine: a.machine
          ? {
              id: a.machine.id,
              name: a.machine.name,
              type: a.machine.type,
            }
          : null,
        user: a.user
          ? {
              id: a.user.id,
              name: a.user.name,
            }
          : null,
      }));
    } catch (error) {
      console.log('Error fetching recent assignments:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }
}
