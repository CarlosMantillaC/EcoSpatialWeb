import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeocodeReverseDto, GeocodeSearchDto } from './dto/geocode.dto';
import { GeocodingService } from './geocoding.service';

@ApiTags('geocode')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Sin JWT o token invalido/expirado.' })
@UseGuards(JwtAuthGuard)
@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @ApiOperation({
    summary: 'Busca un lugar por nombre (solo Cucuta)',
    description:
      'Devuelve sugerencias con etiqueta y coordenadas; el cliente las usa para rellenar el destino de una orden.',
  })
  @ApiOkResponse({
    description: 'Sugerencias con label, lat y lng (lista vacia si no hay coincidencias).',
  })
  @Get()
  search(@Query() dto: GeocodeSearchDto) {
    const limit = dto.limit ? parseInt(dto.limit, 10) : undefined;
    return this.geocodingService.search(dto.q, limit);
  }

  @ApiOperation({
    summary: 'Nombre legible de un punto (geocodificacion inversa)',
  })
  @ApiOkResponse({ description: 'Objeto { label } con la direccion abreviada.' })
  @ApiResponse({ status: 400, description: 'Coordenadas invalidas o fuera del area.' })
  @Get('reverse')
  async reverse(@Query() dto: GeocodeReverseDto) {
    const label = await this.geocodingService.reverse(dto.lat, dto.lng);
    return { label };
  }
}
