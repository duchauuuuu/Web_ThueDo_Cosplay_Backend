import { Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post()
  @ApiOperation({ summary: 'Chạy seed dữ liệu mẫu' })
  @ApiResponse({ status: 201, description: 'Seed thành công' })
  async seed() {
    await this.seedService.seed();
    return {
      message: 'Seed dữ liệu thành công!',
      data: {
        users: '3 users (1 admin, 2 users)',
        categories: '5 categories',
        products: '10 products',
        productImages: '30 images',
        addresses: '2 addresses',
        favorites: '5 favorites',
        orders: '5 orders',
        orderItems: '8 order items',
        payments: '5 payments',
        comments: '3 comments',
      },
    };
  }
}

