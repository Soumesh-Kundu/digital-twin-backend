import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { DatabaseService } from 'src/services/db';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService,DatabaseService],
  exports: [AlertsService],
})
export class AlertsModule {}
