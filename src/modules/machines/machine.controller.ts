// src/machines/machines.controller.ts

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { MachinesService } from './machine.service';
import { MachineDTO } from './dto/machine.dto';
import { Request } from 'express';

@Controller('/machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  async getMachines() {
    return this.machinesService.findAll();
  }

  @Post()
  async createMachine(@Body() body: MachineDTO, @Req() request: Request) {
    try {
      const user = request['user'];

      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException({ message: 'Access Denied' });
      }

      await this.machinesService.create(body);
      return { message: 'Machine created successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      console.error('Error creating machine:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  @Put(':id')
  async updateMachine(@Body() body: MachineDTO, @Param('id') id: string) {
    return this.machinesService.update(id, body);
  }

  @Delete(':id')
  async deleteMachine(@Param('id') id: string) {
    return this.machinesService.delete(id);
  }
}
