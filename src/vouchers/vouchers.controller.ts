import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo voucher mới' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách voucher' })
  findAll() {
    return this.vouchersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết voucher' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật voucher' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa voucher' })
  remove(@Param('id') id: string) {
    return this.vouchersService.remove(id);
  }
}

