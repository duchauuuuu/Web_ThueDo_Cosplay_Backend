import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Product Images')
@Controller('product-images')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post('product/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm ảnh cho sản phẩm (Admin only)' })
  @ApiResponse({ status: 201, description: 'Thêm thành công' })
  create(
    @Param('productId') productId: string,
    @Body() createProductImageDto: CreateProductImageDto,
  ) {
    return this.productImagesService.create(productId, createProductImageDto);
  }

  @Post('product/:productId/multiple')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thêm nhiều ảnh cho sản phẩm (Admin only)' })
  @ApiResponse({ status: 201, description: 'Thêm thành công' })
  createMultiple(
    @Param('productId') productId: string,
    @Body() images: CreateProductImageDto[],
  ) {
    return this.productImagesService.createMultiple(productId, images);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Lấy danh sách ảnh của sản phẩm' })
  findByProduct(@Param('productId') productId: string) {
    return this.productImagesService.findByProduct(productId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm (Admin only)' })
  remove(@Param('id') id: string) {
    return this.productImagesService.remove(id);
  }
}

