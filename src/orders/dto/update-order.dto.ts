import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../entities/order.entity';

export class UpdateOrderDto {
  @ApiProperty({ enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  rentalStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  rentalEndDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rentalAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

