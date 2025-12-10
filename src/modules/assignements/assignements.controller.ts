// src/assignments/assignments.controller.ts

import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AssignmentsService } from './assignements.service';
import { UpdateAssignmentsDTO } from './dto/update-assignements.dto';
import { Request } from 'express';

@Controller('/assignements') // keeping your existing path
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ----------------- existing endpoint -----------------
  @Post('/update')
  async updateAssignments(@Body() body: UpdateAssignmentsDTO) {
    return this.assignmentsService.updateAssignments(body);
  }

  // ----------------- NEW: 1) all machines with assignees -----------------
  // For manager/admin view (you can add role checks later if needed)
  @Get('/machines-with-assignees')
  async getMachinesWithAssignees() {
    return this.assignmentsService.getAllMachinesWithAssignees();
  }

  // ----------------- NEW: 2) machines for current user (engineer dashboard) -----------------
  // For admin role, returns all machines with minimal data
  // For other roles, returns assigned machines with full threshold data
  @Get('/my-machines')
  async getMyMachines(@Req() request: Request) {
    try {
      const user = request['user'];
      
      // Admin gets all machines with minimal data (for alert listening)
      if (user.role === 'ADMIN') {
        return this.assignmentsService.getAllMachinesMinimal();
      }
      
      // Engineers/Maintenance get their assigned machines with full data
      return this.assignmentsService.getMachinesForUser(user.id);
    } catch (error) {
      console.log('Error getting machines for user:', error);
      throw new InternalServerErrorException({ message: 'Internal Server Error' });
    }
  }

  @Get('/machine-assignees')
  async getMachineAssignees(@Query('machineId') machineId: string) {
    return this.assignmentsService.getAssigneesForMachine(machineId);
  }

  // ----------------- NEW: 3) recent assignees -----------------
  // Returns latest assignments, ordered by assignedAt desc
  // includes: machine name, machine type, user name
  @Get('/recent')
  async getRecentAssignments(@Query('limit') limit?: string) {
    const take = limit ? Number(limit) : 10;
    return this.assignmentsService.getRecentAssignments(take);
  }
}
