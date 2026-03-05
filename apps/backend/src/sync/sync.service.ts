import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSyncLogDto } from './dto/create-sync-log.dto';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async logOperation(createSyncLogDto: CreateSyncLogDto) {
    return this.prisma.syncLog.create({
      data: {
        deviceId: createSyncLogDto.deviceId,
        entityType: createSyncLogDto.entityType,
        entityId: createSyncLogDto.entityId,
        operation: createSyncLogDto.operation,
        data: createSyncLogDto.data,
      },
    });
  }

  async getPendingLogs(deviceId?: string) {
    const where: any = {
      syncStatus: 'pending',
    };

    if (deviceId) {
      where.deviceId = deviceId;
    }

    return this.prisma.syncLog.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getLogsByDevice(deviceId: string) {
    return this.prisma.syncLog.findMany({
      where: { deviceId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string,
  ) {
    const log = await this.prisma.syncLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Sync log with ID ${id} not found`);
    }

    const updateData: any = {
      syncStatus: status,
      lastAttempt: new Date(),
      attempts: { increment: 1 },
    };

    if (status === 'synced') {
      updateData.syncedAt = new Date();
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return this.prisma.syncLog.update({
      where: { id },
      data: updateData,
    });
  }

  async retryFailed(deviceId?: string) {
    const where: any = {
      syncStatus: 'failed',
    };

    if (deviceId) {
      where.deviceId = deviceId;
    }

    const failedLogs = await this.prisma.syncLog.findMany({
      where,
    });

    // Reset failed logs to pending for retry
    const updatePromises = failedLogs.map((log) =>
      this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          syncStatus: 'pending',
          errorMessage: null,
        },
      })
    );

    return Promise.all(updatePromises);
  }

  async getAllLogs(params?: { syncStatus?: string; entityType?: string; deviceId?: string }) {
    const where: any = {};

    if (params?.syncStatus) {
      where.syncStatus = params.syncStatus;
    }

    if (params?.entityType) {
      where.entityType = params.entityType;
    }

    if (params?.deviceId) {
      where.deviceId = params.deviceId;
    }

    return this.prisma.syncLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getLogById(id: string) {
    const log = await this.prisma.syncLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Sync log with ID ${id} not found`);
    }

    return log;
  }
}
