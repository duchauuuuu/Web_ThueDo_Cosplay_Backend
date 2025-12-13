import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(createProductDto);
    return this.productsRepository.save(product);
  }

  async findAll(
    paginationDto: PaginationDto,
    categoryId?: string,
    search?: string,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :isActive', { isActive: true });

    if (categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Get total count BEFORE joining images and comments (to avoid duplicates)
    const total = await queryBuilder.getCount();

    // Now get paginated results WITH images and comments
    // IMPORTANT: Use take/skip BEFORE joins to get correct number of PRODUCTS
    const data = await queryBuilder
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Then load relations separately to avoid row multiplication
    const productIds = data.map((p) => p.id);
    
    if (productIds.length > 0) {
      // Load productImages
      await this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.productImages', 'productImages', 'productImages.isActive = :imageActive', { imageActive: true })
        .where('product.id IN (:...ids)', { ids: productIds })
        .orderBy('productImages.order', 'ASC')
        .getMany()
        .then((productsWithImages) => {
          productsWithImages.forEach((pwi) => {
            const product = data.find((p) => p.id === pwi.id);
            if (product) {
              product.productImages = pwi.productImages;
            }
          });
        });

      // Load comments
      await this.productsRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.comments', 'comments', 'comments.isActive = :commentActive', { commentActive: true })
        .where('product.id IN (:...ids)', { ids: productIds })
        .getMany()
        .then((productsWithComments) => {
          productsWithComments.forEach((pwc) => {
            const product = data.find((p) => p.id === pwc.id);
            if (product) {
              product.comments = pwc.comments;
            }
          });
        });
    }

    // Enrich products với rating và reviewCount
    const enrichedData = data.map((product) => {
      const activeComments =
        product.comments?.filter((c) => c.isActive) || [];
      const avgRating =
        activeComments.length > 0
          ? activeComments.reduce((sum, c) => sum + c.rating, 0) /
            activeComments.length
          : 0;

      return {
        ...product,
        averageRating: Math.floor(avgRating), // Làm tròn xuống: 4.9 → 4
        reviewCount: activeComments.length,
      };
    });

    return {
      data: enrichedData,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'productImages', 'comments'],
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }

    // Enrich with rating and reviewCount
    const activeComments =
      product.comments?.filter((c) => c.isActive) || [];
    const avgRating =
      activeComments.length > 0
        ? activeComments.reduce((sum, c) => sum + c.rating, 0) /
          activeComments.length
        : 0;

    return {
      ...product,
      averageRating: Math.floor(avgRating), // Làm tròn xuống: 4.9 → 4
      reviewCount: activeComments.length,
    } as Product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async checkAvailability(
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const product = await this.findOne(productId);
    return product.isAvailable && product.quantity >= quantity;
  }
}

