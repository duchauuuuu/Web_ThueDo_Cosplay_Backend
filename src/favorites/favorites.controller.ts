import {
  Controller,
  Get,
  Post,
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
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':productId')
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  @ApiResponse({ status: 201, description: 'Thêm thành công' })
  addToFavorites(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.addToFavorites(user.id, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi danh sách yêu thích' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  removeFromFavorites(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.removeFromFavorites(user.id, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách yêu thích của user' })
  getUserFavorites(@CurrentUser() user: any) {
    return this.favoritesService.getUserFavorites(user.id);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Kiểm tra sản phẩm có trong danh sách yêu thích không' })
  isFavorite(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return this.favoritesService.isFavorite(user.id, productId);
  }
}

