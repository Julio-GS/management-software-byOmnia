import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CierresCajaService } from './cierres-caja.service';
import { CreateCierreCajaDto } from './dto/create-cierre-caja.dto';
import { FilterCierresCajaDto } from './dto/filter-cierres-caja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';

@Controller('cierres-caja')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CierresCajaController {
  constructor(private readonly cierresCajaService: CierresCajaService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  create(@Body() dto: CreateCierreCajaDto, @CurrentUser() user: any) {
    return this.cierresCajaService.createCierre(dto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  findAll(@Query() query: FilterCierresCajaDto) {
    return this.cierresCajaService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  findOne(@Param('id') id: string) {
    return this.cierresCajaService.findById(id);
  }
}
