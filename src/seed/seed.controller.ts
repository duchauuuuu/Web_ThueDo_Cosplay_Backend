import { Controller, Post, Get } from '@nestjs/common';
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
    const result = await this.seedService.seed();
    return {
      message: 'Seed dữ liệu thành công!',
      data: result.counts,
    };
  }

  @Get('debug-products')
  @ApiOperation({ summary: 'Debug: Xem tất cả products trong DB' })
  @ApiResponse({ status: 200, description: 'Danh sách tất cả products' })
  async debugProducts() {
    return await this.seedService.debugProducts();
  }
}

