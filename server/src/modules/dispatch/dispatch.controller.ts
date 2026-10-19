import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { dispatchToJsonLd } from '../../semantic/jsonld';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { DispatchService } from './dispatch.service';

@UseGuards(JwtAuthGuard)
@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post()
  create(@Body() dto: CreateDispatchDto) {
    return this.dispatchService.create(dto);
  }

  @Get()
  async findAll() {
    const dispatches = await this.dispatchService.findAll();
    return dispatches;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dispatchService.findOne(id);
  }

  @Get(':id/jsonld')
  async findOneJsonLd(@Param('id') id: string) {
    return dispatchToJsonLd(await this.dispatchService.findOne(id));
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.dispatchService.complete(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.dispatchService.cancel(id);
  }
}
