import { Body, Controller, Delete, ForbiddenException, Get, InternalServerErrorException, Param, Post, Put, Req } from "@nestjs/common";
import { MachineDTO } from "src/DTO/machines";
import { DatabaseService } from "src/services/db";

@Controller('/machines')
export class MachineController {
    constructor(private db: DatabaseService){}

    @Get()
    async getMachines() {
        try {
            const data = await this.db.machines.findMany();
            return data;
        } catch (error) {
            console.log('Error fetching machines:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Post()
    async createMachine(@Body() body: MachineDTO,@Req() request: Request) {
        try {
            if(!request['user'] || request['user'].role !== 'ADMIN'){
                throw new ForbiddenException({ message: 'Access Denied' });
            }
            const machine = await this.db.machines.create({
                data: {
                    name: body.name,
                    model_name: body.model_name,
                    type: body.type,
                    status: body.status,
                    power_max: body.power_max,
                    temperature_max: body.temperature_max,
                    vibration_max: body.vibration_max,
                    thresholds: body.thresholds
                }
            });
            return {  message:"Machine created successfully" };
        } catch (error) {
            console.log('Error creating machine:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Put(":id")
    async updateMachine(@Body() body: MachineDTO, @Param('id') id: string) {
        try {
            await this.db.machines.update({
                where: { id },
                data: body
            });
            return { message: 'Machine updated successfully'};
        } catch (error) {
            console.log('Error updating machine:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }

    @Delete(":id")
    async deleteMachine(@Param('id') id: string) {
        try {
            await this.db.machines.delete({
                where: { id }
            });
            return { message: 'Machine deleted successfully' };
        }
        catch (error) {
            console.log('Error deleting machine:', error);
            throw new InternalServerErrorException({message: 'Internal Server Error' });
        }
    }
}