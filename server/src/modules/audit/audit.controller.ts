import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({
    summary: 'Bitacora de acciones sobre el negocio',
    description:
      'Cada entrada registra accion (p. ej. dispatch.approve, vehicle.create), usuario, entidad y fecha.',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Filtra por accion exacta (p. ej. "order.create").',
    example: 'dispatch.approve',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximo de entradas a devolver (por defecto 50).',
    example: 50,
  })
  @ApiOkResponse({ description: 'Entradas de auditoria, de la mas reciente a la mas antigua.' })
  @Get()
  findAll(
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({
      action,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
