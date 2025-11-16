import { Body, Controller, Delete, ForbiddenException, Get, Headers, InternalServerErrorException, Param, Post, Put, Req } from "@nestjs/common";
import { request, Request } from 'express';
import { CreateUserDTO, UpdateUserDTO } from "src/DTO/user";
import { DatabaseService } from "src/services/db";
import { hash } from "bcrypt";

@Controller('/users')
export class UserController {
    constructor(private db: DatabaseService){}

    @Get()
    async getUsers(@Req() request: Request) {
        try {
            if(request['user'].role !== 'ADMIN'){
                throw new ForbiddenException({ message: 'Access Denied' });
            }

            const data=await this.db.user.findMany({
                where:{
                    role: { not: "ADMIN" }
                },
                select:{
                    id: true,
                    name: true,
                    email: true,
                    role: true
                },
                orderBy:{
                    createdAt: 'desc'
                }
            });
            return data;
        } catch (error) {
            console.log('Error fetching users:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Post()
    async createUser(@Body() newUserData: CreateUserDTO) {
        try {
            const hashedPassword = await hash(newUserData.password, 10);
            const user = await this.db.user.create({
                data: {
                    email: newUserData.email,
                    password: hashedPassword,
                    name: newUserData.name,
                    role: newUserData.role
                }
            });
            return { message: "User created successfully" };
        } catch (error) {
            console.log('Error creating user:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Put(":id")
    async updateUser(@Body() updateData: UpdateUserDTO, @Param('id') id: string) {
        try {
            if(updateData.password){
                updateData.password = await hash(updateData.password, 10);
            }
            console.log('Update Data:', updateData);
            const user = await this.db.user.update({
                where: { id },
                data: updateData
            });
            console.log('Updated User:', user);
            return { message: 'User updated successfully'};
        }
        catch (error) {
            console.log('Error updating user:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Delete(":id")
    async deleteUser(@Param('id') id: string) {
        try {
            await this.db.user.delete({
                where: { id }
            });
            return { message: 'User deleted successfully' };
        }
        catch (error) {
            console.log('Error deleting user:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }
}