import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

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
