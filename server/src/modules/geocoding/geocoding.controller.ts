import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeocodeReverseDto, GeocodeSearchDto } from './dto/geocode.dto';
import { GeocodingService } from './geocoding.service';

@UseGuards(JwtAuthGuard)
@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get()
  search(@Query() dto: GeocodeSearchDto) {
    const limit = dto.limit ? parseInt(dto.limit, 10) : undefined;
    return this.geocodingService.search(dto.q, limit);
  }

  @Get('reverse')
  async reverse(@Query() dto: GeocodeReverseDto) {
    const label = await this.geocodingService.reverse(dto.lat, dto.lng);
    return { label };
  }
}
