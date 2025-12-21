import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ minimum: 1, maximum: 5, default: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ description: 'ID của đơn hàng đã mua' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'URL ảnh đánh giá (tùy chọn)', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string; // Deprecated, dùng imageUrls

  @ApiProperty({ description: 'URLs nhiều ảnh đánh giá (tùy chọn)', required: false, type: [String] })
  @IsOptional()
  imageUrls?: string[];
}

