import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { DatabaseService } from 'src/services/db';

@Module({
  providers: [AlertsService, DatabaseService],
  exports: [AlertsService],
})
export class AlertsModule {}
