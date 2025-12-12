import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo hóa đơn mới (Admin only)' })
  @ApiResponse({ status: 201, description: 'Tạo hóa đơn thành công' })
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  findAll(@CurrentUser() user: any) {
    // Admin xem tất cả, user chỉ xem của mình
    const userId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.invoicesService.findAll(userId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn theo order ID' })
  findByOrder(@Param('orderId') orderId: string) {
    return this.invoicesService.findByOrder(orderId);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: 'Lấy hóa đơn theo mã hóa đơn' })
  findByInvoiceNumber(@Param('invoiceNumber') invoiceNumber: string) {
    return this.invoicesService.findByInvoiceNumber(invoiceNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin hóa đơn theo ID' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật hóa đơn (Admin only)' })
  update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateInvoiceDto);
  }

  @Post(':id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Đánh dấu hóa đơn đã thanh toán (Admin only)' })
  @ApiResponse({ status: 200, description: 'Đánh dấu thanh toán thành công' })
  markAsPaid(
    @Param('id') id: string,
    @Body() body: { paymentId?: string },
  ) {
    return this.invoicesService.markAsPaid(id, body.paymentId);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Hủy hóa đơn (Admin only)' })
  cancel(@Param('id') id: string) {
    return this.invoicesService.cancel(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa hóa đơn (Admin only)' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}

