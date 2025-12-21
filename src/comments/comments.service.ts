import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../entities/order.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private productsService: ProductsService,
    private ordersService: OrdersService,
  ) {}

  async create(
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    // Kiểm tra sản phẩm tồn tại
    await this.productsService.findOne(createCommentDto.productId);

    // Kiểm tra đơn hàng tồn tại và thuộc về user
    const order = await this.ordersService.findOne(createCommentDto.orderId);

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền comment đơn hàng này');
    }

    // Kiểm tra đơn hàng đã được xác nhận (đã mua xong)
    const allowedStatuses = [
      OrderStatus.CONFIRMED,
      OrderStatus.RENTED,
      OrderStatus.RETURNED,
    ];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Chỉ có thể comment sau khi đơn hàng đã được xác nhận',
      );
    }

    // Kiểm tra đơn hàng có chứa sản phẩm này không
    const hasProduct = order.orderItems.some(
      (item) => item.productId === createCommentDto.productId,
    );
    if (!hasProduct) {
      throw new BadRequestException('Sản phẩm này không có trong đơn hàng');
    }

    // Kiểm tra đơn hàng đã có comment chưa (mỗi order chỉ comment 1 lần)
    const existingComment = await this.commentsRepository.findOne({
      where: { orderId: createCommentDto.orderId },
    });
    if (existingComment) {
      throw new BadRequestException(
        'Đơn hàng này đã được đánh giá. Mỗi đơn hàng chỉ có thể comment 1 lần',
      );
    }

    // Xử lý imageUrls: ưu tiên imageUrls, fallback về imageUrl (backward compatibility)
    const imageUrls: string[] | null =
      createCommentDto.imageUrls && Array.isArray(createCommentDto.imageUrls) && createCommentDto.imageUrls.length > 0
        ? createCommentDto.imageUrls
        : createCommentDto.imageUrl && typeof createCommentDto.imageUrl === 'string'
          ? [createCommentDto.imageUrl]
          : null;

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      userId,
      imageUrls,
    });

    return this.commentsRepository.save(comment);
  }

  async findByProduct(
    productId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [comments, total] = await this.commentsRepository.findAndCount({
      where: { productId, isActive: true },
      relations: ['user', 'order'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Transform data để thêm userName
    const data = comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      userName: comment.user?.fullName || 'Người dùng ẩn danh',
      productId: comment.productId,
      orderId: comment.orderId,
      rating: comment.rating,
      content: comment.content,
      imageUrl: comment.imageUrl || null, // Backward compatibility
      imageUrls: comment.imageUrls || null, // Multiple images
      isActive: comment.isActive,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByOrder(orderId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { orderId, isActive: true },
      relations: ['user', 'product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { userId, isActive: true },
      relations: ['product', 'order'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['user', 'product', 'order'],
    });
    if (!comment) {
      throw new NotFoundException(`Không tìm thấy bình luận với ID: ${id}`);
    }
    return comment;
  }

  async update(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
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
    const result: { avg: number | null } | undefined =
      await this.commentsRepository
        .createQueryBuilder('comment')
        .select('AVG(comment.rating)', 'avg')
        .where('comment.productId = :productId', { productId })
        .andWhere('comment.isActive = :isActive', { isActive: true })
        .getRawOne();

    return result?.avg ? parseFloat(String(result.avg)) : 0;
  }
}
