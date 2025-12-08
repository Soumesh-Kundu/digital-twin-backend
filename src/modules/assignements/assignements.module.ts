// src/assignments/assignments.module.ts

import { Module } from '@nestjs/common';
import { AssignmentsController } from './assignements.controller';
import { AssignmentsService } from './assignements.service';
import { DatabaseService } from 'src/services/db';

@Module({
  controllers: [AssignmentsController],
  providers: [AssignmentsService, DatabaseService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
