import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './database/prisma.module';
import { OmniaCacheModule } from './cache/cache.module';
import { LoggerModule } from './shared/logger/logger.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { SyncModule } from './sync/sync.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PricingModule } from './pricing/pricing.module';
import { ReportsModule } from './reports/reports.module';
import { UnidadesMedidaModule } from './unidades-medida/unidades-medida.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { RubrosModule } from './rubros/rubros.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { CajasModule } from './cajas/cajas.module';
import { MovimientosCajaModule } from './movimientos-caja/movimientos-caja.module';
import { CierresCajaModule } from './cierres-caja/cierres-caja.module';
import { GlobalErrorInterceptor } from './shared/interceptors/global-error.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CqrsModule.forRoot(),
    LoggerModule,
    OmniaCacheModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SalesModule,
    InventoryModule,
    SyncModule,
    PricingModule,
    ReportsModule,
    // Phase 2: Master Data Modules
    UnidadesMedidaModule,
    ProveedoresModule,
    RubrosModule,
    // Phase 4: Sales Operations
    DevolucionesModule,
    CajasModule,
    MovimientosCajaModule,
    CierresCajaModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalErrorInterceptor,
    },
  ],
})
export class AppModule {}
