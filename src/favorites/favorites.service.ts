import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    private productsService: ProductsService,
  ) {}

  async toggleFavorite(userId: string, productId: string): Promise<{ message: string; action: 'Added' | 'Removed' }> {
    // Kiểm tra sản phẩm tồn tại
    await this.productsService.findOne(productId);

    // Kiểm tra đã có trong favorites chưa
    const existing = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      // Nếu đã có thì xóa
      await this.favoritesRepository.remove(existing);
      return { message: 'Đã xóa khỏi danh sách yêu thích', action: 'Removed' };
    } else {
      // Nếu chưa có thì thêm
      const favorite = this.favoritesRepository.create({
        userId,
        productId,
      });
      await this.favoritesRepository.save(favorite);
      return { message: 'Đã thêm vào danh sách yêu thích', action: 'Added' };
    }
  }

  async addToFavorites(userId: string, productId: string): Promise<Favorite> {
    // Kiểm tra sản phẩm tồn tại
    await this.productsService.findOne(productId);

    // Kiểm tra đã có trong favorites chưa
    const existing = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      throw new ConflictException('Sản phẩm đã có trong danh sách yêu thích');
    }

    const favorite = this.favoritesRepository.create({
      userId,
      productId,
    });

    return this.favoritesRepository.save(favorite);
  }

  async removeFromFavorites(userId: string, productId: string): Promise<void> {
    const favorite = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });

    if (!favorite) {
      throw new NotFoundException('Sản phẩm không có trong danh sách yêu thích');
    }

    await this.favoritesRepository.remove(favorite);
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return this.favoritesRepository.find({
      where: { userId },
      relations: ['product', 'product.category', 'product.productImages'],
      order: { createdAt: 'DESC' },
    });
  }

  async isFavorite(userId: string, productId: string): Promise<boolean> {
    const favorite = await this.favoritesRepository.findOne({
      where: { userId, productId },
    });
    return !!favorite;
  }
}

