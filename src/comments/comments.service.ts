import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, createCommentDto: CreateCommentDto): Promise<Comment> {
    // Kiểm tra sản phẩm tồn tại
    await this.productsService.findOne(createCommentDto.productId);

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      userId,
    });

    return this.commentsRepository.save(comment);
  }

  async findByProduct(productId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { productId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!comment) {
      throw new NotFoundException(`Không tìm thấy bình luận với ID: ${id}`);
    }
    return comment;
  }

  async update(id: string, userId: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.findOne(id);

    // Chỉ cho phép user sở hữu comment hoặc admin mới được sửa
    if (comment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền sửa bình luận này');
    }

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: string, userId: string): Promise<void> {
    const comment = await this.findOne(id);

    // Chỉ cho phép user sở hữu comment hoặc admin mới được xóa
    if (comment.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bình luận này');
    }

    await this.commentsRepository.remove(comment);
  }

  async getAverageRating(productId: string): Promise<number> {
    const result = await this.commentsRepository
      .createQueryBuilder('comment')
      .select('AVG(comment.rating)', 'avg')
      .where('comment.productId = :productId', { productId })
      .andWhere('comment.isActive = :isActive', { isActive: true })
      .getRawOne();

    return result?.avg ? parseFloat(result.avg) : 0;
  }
}

