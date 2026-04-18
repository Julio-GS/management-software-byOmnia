import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetSalesQuery } from './queries/get-sales.query';
import { GetSaleByNumberQuery } from './queries/get-sale-by-number.query';
import { CreateSaleCommand } from './commands/create-sale.command';
import { CancelSaleCommand } from './commands/cancel-sale.command';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly salesService: SalesService,
  ) {}

  @Post()
  @Roles('cashier', 'manager', 'admin')
  @ApiOperation({ summary: 'Create a new sale' })
  @ApiResponse({ status: 201, description: 'Sale created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid sale data' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Insufficient stock' })
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.commandBus.execute(
      new CreateSaleCommand(
        createSaleDto.items,
        createSaleDto.paymentMethod,
        createSaleDto.discountAmount,
        createSaleDto.customerId,
        createSaleDto.customerName,
        createSaleDto.customerEmail,
        createSaleDto.notes,
        createSaleDto.cashierId,
        createSaleDto.deviceId,
      ),
    );
  }

  @Get()
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Get all sales' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Sales retrieved successfully' })
  findAll(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const params: any = {};
    if (status) params.status = status;
    if (startDate) params.startDate = new Date(startDate);
    if (endDate) params.endDate = new Date(endDate);

    return this.queryBus.execute(new GetSalesQuery(params));
  }

  @Get('number/:saleNumber')
  @Roles('cashier', 'manager', 'admin')
  @ApiOperation({ summary: 'Get sale by sale number' })
  @ApiResponse({ status: 200, description: 'Sale found' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  findBySaleNumber(@Param('saleNumber') saleNumber: string) {
    return this.queryBus.execute(new GetSaleByNumberQuery(saleNumber));
  }

  @Patch(':id/cancel')
  @Roles('cashier', 'manager', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a completed sale and restore stock' })
  @ApiResponse({ status: 200, description: 'Sale cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  @ApiResponse({ status: 409, description: 'Sale cannot be cancelled (wrong status)' })
  cancel(
    @Param('id') id: string,
    @Body() cancelSaleDto: CancelSaleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.commandBus.execute(
      new CancelSaleCommand(id, user.id, cancelSaleDto.reason),
    );
  }

  @Get(':id')
  @Roles('cashier', 'manager', 'admin')
  @ApiOperation({ summary: 'Get sale by ID' })
  @ApiResponse({ status: 200, description: 'Sale found' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
