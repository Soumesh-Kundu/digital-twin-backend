// src/users/users.controller.ts

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
import { UsersService } from './users.service';
import { CreateUserDTO, UpdateUserDTO } from './dto/users.dto';
import { Request } from 'express';

@Controller('/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(@Req() request: Request) {
    try {
      const user = request['user'];

      if (!user || user.role !== 'ADMIN') {
        throw new ForbiddenException({ message: 'Access Denied' });
      }

      return await this.usersService.findNonAdminUsers();
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.log('Error fetching users:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  @Post()
  async createUser(@Body() newUserData: CreateUserDTO) {
    // You can also restrict this to ADMIN later using guards if needed
    return this.usersService.createUser(newUserData);
  }

  @Put(':id')
  async updateUser(
    @Body() updateData: UpdateUserDTO,
    @Param('id') id: string,
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
