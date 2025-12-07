import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo địa chỉ mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(@CurrentUser() user: any, @Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(user.id, createAddressDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ của user' })
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.id);
  }

  @Get('default')
  @ApiOperation({ summary: 'Lấy địa chỉ mặc định' })
  getDefault(@CurrentUser() user: any) {
    return this.addressesService.getDefault(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin địa chỉ theo ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, user.id, updateAddressDto);
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Đặt địa chỉ làm mặc định' })
  setDefault(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.setDefault(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa địa chỉ' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.remove(id, user.id);
  }
}

