import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { CreateSyncLogDto } from './dto/create-sync-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Sync')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('logs')
  @Roles('cashier', 'manager', 'admin')
  @ApiOperation({ summary: 'Log a sync operation' })
  @ApiResponse({ status: 201, description: 'Sync log created successfully' })
  logOperation(@Body() createSyncLogDto: CreateSyncLogDto) {
    return this.syncService.logOperation(createSyncLogDto);
  }

  @Get('logs')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get all sync logs' })
  @ApiQuery({ name: 'syncStatus', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiResponse({ status: 200, description: 'Sync logs retrieved successfully' })
  getAllLogs(
    @Query('syncStatus') syncStatus?: string,
    @Query('entityType') entityType?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const params: any = {};
    if (syncStatus) params.syncStatus = syncStatus;
    if (entityType) params.entityType = entityType;
    if (deviceId) params.deviceId = deviceId;

    return this.syncService.getAllLogs(params);
  }

  @Get('logs/pending')
  @Roles('cashier', 'manager', 'admin')
  @ApiOperation({ summary: 'Get pending sync logs' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiResponse({ status: 200, description: 'Pending logs retrieved successfully' })
  getPendingLogs(@Query('deviceId') deviceId?: string) {
    return this.syncService.getPendingLogs(deviceId);
  }

  @Get('logs/device/:deviceId')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get sync logs by device ID' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  getLogsByDevice(@Param('deviceId') deviceId: string) {
    return this.syncService.getLogsByDevice(deviceId);
  }

  @Get('logs/:id')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get sync log by ID' })
  @ApiResponse({ status: 200, description: 'Sync log found' })
  @ApiResponse({ status: 404, description: 'Sync log not found' })
  getLogById(@Param('id') id: string) {
    return this.syncService.getLogById(id);
  }

  @Patch('logs/:id/status')
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Update sync log status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Sync log not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('errorMessage') errorMessage?: string,
  ) {
    return this.syncService.updateStatus(id, status, errorMessage);
  }

  @Post('retry-failed')
  @Roles('admin')
  @ApiOperation({ summary: 'Retry failed sync operations' })
  @ApiQuery({ name: 'deviceId', required: false })
  @ApiResponse({ status: 200, description: 'Failed logs reset to pending' })
  retryFailed(@Query('deviceId') deviceId?: string) {
    return this.syncService.retryFailed(deviceId);
  }
}
