import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService } from './alerts.service';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@Query('unread') unread?: string) {
    return this.alertsService.findAll(unread === 'true');
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.alertsService.markRead(id);
  }

  @Post('read-all')
  markAllRead() {
    return this.alertsService.markAllRead();
  }
}
