import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../../entities/invoice.entity';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'ID của đơn hàng' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'ID của payment (nếu đã thanh toán)' })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Thuế VAT', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: 'Giảm giá', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ description: 'Ngày phát hành hóa đơn' })
  @IsDateString()
  issuedDate: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn thanh toán' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tên công ty' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ công ty' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({ description: 'Mã số thuế công ty' })
  @IsOptional()
  @IsString()
  companyTaxCode?: string;

  @ApiPropertyOptional({ description: 'Tên khách hàng' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Email khách hàng' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại khách hàng' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ khách hàng' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái hóa đơn',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

