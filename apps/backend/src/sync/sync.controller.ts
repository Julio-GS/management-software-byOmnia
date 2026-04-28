import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BatchPushService } from './services/batch-push.service';
import { PullService } from './services/pull.service';
import { BatchPushDto } from './dto/batch-push.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sync (Offline-First)')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(
    private readonly batchPushService: BatchPushService,
    private readonly pullService: PullService,
  ) {}

  @Post('batch-push')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Recibir lote de operaciones offline desde Electron' })
  @ApiResponse({ status: 201, description: 'Batch procesado exitosamente' })
  async batchPush(@Body() dto: BatchPushDto, @CurrentUser() user: any) {
    return this.batchPushService.processBatch(dto, user.id ?? user.sub);
  }

  @Get('pull')
  @Roles(UserRole.CAJERO, UserRole.ENCARGADO, UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener delta de actualizaciones (tablas maestras) para Electron' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO date string de la última sincronización' })
  @ApiResponse({ status: 200, description: 'Delta obtenido exitosamente' })
  async pullChanges(@Query('since') since?: string) {
    return this.pullService.pullChanges(since);
  }
}
