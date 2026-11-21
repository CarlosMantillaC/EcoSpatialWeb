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
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @ApiOperation({
    summary: 'Historial de alertas (todas o sin leer)',
    description:
      'Tipos: geocerca, velocidad, llegada y sistema; severidad info, warning o critical.',
  })
  @ApiQuery({
    name: 'unread',
    required: false,
    enum: ['true'],
    description: 'Pasa "true" para ver solo las alertas sin leer.',
  })
  @ApiOkResponse({ description: 'Lista de alertas, de la mas reciente a la mas antigua.' })
  @Get()
  findAll(@Query('unread') unread?: string) {
    return this.alertsService.findAll(unread === 'true');
  }

  @ApiOperation({ summary: 'Marca una alerta como leida' })
  @ApiParam({ name: 'id', description: 'UUID de la alerta.' })
  @ApiOkResponse({ description: 'Alerta marcada como leida.' })
  @ApiResponse({ status: 404, description: 'No existe esa alerta.' })
  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.alertsService.markRead(id);
  }

  @ApiOperation({ summary: 'Marca todas las alertas como leidas' })
  @ApiOkResponse({ description: 'Contador de alertas actualizadas.' })
  @Post('read-all')
  markAllRead() {
    return this.alertsService.markAllRead();
  }
}
