// src/machines/machines.module.ts

import { Module } from '@nestjs/common';
import { MachinesController } from './machine.controller';
import { MachinesService } from './machine.service';
import { DatabaseService } from 'src/services/db';

@Module({
  controllers: [MachinesController],
  providers: [MachinesService, DatabaseService],
  exports: [MachinesService],
})
export class MachinesModule {}
