// src/alerts/alerts.controller.ts

import {
  Controller,
  Get,
  Put,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AlertsService } from './alerts.service';
import { GetAlertsQueryDto, UpdateAlertStatusDto } from './dto/alerts.dto';

@Controller('/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async getMyAlerts(
    @Req() request: Request,
    @Query() query: GetAlertsQueryDto,
  ) {
    const user = request['user'];
    return this.alertsService.getAlertsForUser(user.id, query);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAlertStatusDto,
    @Req() request: Request,
  ) {
    const user = request['user'];
    return this.alertsService.updateAlertStatus(id, user.id, body);
  }
}
