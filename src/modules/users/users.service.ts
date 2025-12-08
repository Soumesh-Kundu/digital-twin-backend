// src/users/users.service.ts

import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from 'src/services/db';
import { CreateUserDTO, UpdateUserDTO } from './dto/users.dto';
import { hash } from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findNonAdminUsers() {
    try {
      return await this.db.user.findMany({
        where: {
          role: { not: 'ADMIN' },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.log('Error fetching users:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async createUser(newUserData: CreateUserDTO) {
    try {
      const hashedPassword = await hash(newUserData.password, 10);

      await this.db.user.create({
        data: {
          email: newUserData.email,
          password: hashedPassword,
          name: newUserData.name,
          role: newUserData.role,
        },
      });

      return { message: 'User created successfully' };
    } catch (error) {
      console.log('Error creating user:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async updateUser(id: string, updateData: UpdateUserDTO) {
    try {
      const data: any = { ...updateData };

      if (updateData.password) {
        data.password = await hash(updateData.password, 10);
      }

      await this.db.user.update({
        where: { id },
        data,
      });

      return { message: 'User updated successfully' };
    } catch (error) {
      console.log('Error updating user:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }

  async deleteUser(id: string) {
    try {
      await this.db.user.delete({
        where: { id },
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      console.log('Error deleting user:', error);
      throw new InternalServerErrorException({
        message: 'Internal Server Error',
      });
    }
  }
}
