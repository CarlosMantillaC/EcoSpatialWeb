import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary: 'KPIs del periodo',
    description:
      'Totales de despachos (completados/cancelados/distancia/tiempo promedio), servicios por dia, vehiculos destacados, ordenes, flota y alertas del rango.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Fecha inicial inclusive (YYYY-MM-DD). Por defecto hoy - 30 dias.',
    example: '2026-10-21',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Fecha final inclusive (YYYY-MM-DD). Por defecto hoy.',
    example: '2026-11-20',
  })
  @ApiOkResponse({ description: 'Resumen de KPIs del periodo.' })
  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.summary(from, to);
  }

  @ApiOperation({
    summary: 'Exporta el historial de despachos en CSV',
    description:
      'Mismo rango que /summary. Se descarga como archivo `despachos.csv`.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Fecha inicial inclusive (YYYY-MM-DD).',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Fecha final inclusive (YYYY-MM-DD).',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'CSV con el historial de despachos del rango.',
  })
  @Get('dispatches.csv')
  async dispatchesCsv(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.reportsService.dispatchesCsv(from, to);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="despachos.csv"',
    });
    res.send(csv);
  }
}
