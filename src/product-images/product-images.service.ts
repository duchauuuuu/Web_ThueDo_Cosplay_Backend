import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductsService } from '../products/products.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    private productsService: ProductsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    productId: string,
    createProductImageDto: CreateProductImageDto,
  ): Promise<ProductImage> {
    // Kiểm tra sản phẩm tồn tại
    await this.productsService.findOne(productId);

    const image = this.productImagesRepository.create({
      ...createProductImageDto,
      productId,
      order: createProductImageDto.order || 0,
    });

    return this.productImagesRepository.save(image);
  }

  async createMultiple(
    productId: string,
    images: CreateProductImageDto[],
  ): Promise<ProductImage[]> {
    await this.productsService.findOne(productId);

    const productImages = images.map((img, index) =>
      this.productImagesRepository.create({
        ...img,
        productId,
        order: img.order ?? index,
      }),
    );

    return this.productImagesRepository.save(productImages);
  }

  async findByProduct(productId: string): Promise<ProductImage[]> {
    return this.productImagesRepository.find({
      where: { productId, isActive: true },
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ProductImage> {
    const image = await this.productImagesRepository.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!image) {
      throw new NotFoundException(`Không tìm thấy ảnh với ID: ${id}`);
    }
    return image;
  }

  async updateOrder(images: { id: string; order: number }[]): Promise<void> {
    const updatePromises = images.map((img) =>
      this.productImagesRepository.update(img.id, { order: img.order }),
    );
    await Promise.all(updatePromises);
  }

  async remove(id: string): Promise<void> {
    const image = await this.findOne(id);

    // Xóa ảnh từ Cloudinary nếu có publicId
    if (image.publicId) {
      try {
        await this.cloudinaryService.deleteImage(image.publicId);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    await this.productImagesRepository.remove(image);
  }

  async removeMultiple(ids: string[]): Promise<void> {
    const images = await this.productImagesRepository
      .createQueryBuilder('image')
      .where('image.id IN (:...ids)', { ids })
      .getMany();

    // Xóa ảnh từ Cloudinary
    const publicIds = images
      .map((img) => img.publicId)
      .filter((id) => id) as string[];
    if (publicIds.length > 0) {
      try {
        await this.cloudinaryService.deleteMultipleImages(publicIds);
      } catch (error) {
        console.error('Error deleting images from Cloudinary:', error);
      }
    }

    await this.productImagesRepository.remove(images);
  }
}

