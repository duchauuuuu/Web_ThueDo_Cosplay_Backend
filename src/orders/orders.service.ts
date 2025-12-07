import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    private productsService: ProductsService,
    private dataSource: DataSource,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Kiểm tra và tính toán giá
      let totalPrice = 0;
      let totalDeposit = 0;
      const orderItems: OrderItem[] = [];

      for (const item of createOrderDto.items) {
        const product = await this.productsService.findOne(item.productId);

        if (!product.isAvailable) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} hiện không có sẵn`,
          );
        }

        if (product.quantity < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm ${product.name} chỉ còn ${product.quantity} sản phẩm`,
          );
        }

        const itemPrice = product.price * item.quantity;
        const itemDeposit = (product.deposit || 0) * item.quantity;
        totalPrice += itemPrice;
        totalDeposit += itemDeposit;

        // Giảm số lượng sản phẩm
        product.quantity -= item.quantity;
        if (product.quantity === 0) {
          product.isAvailable = false;
        }
        await queryRunner.manager.save(product);

        // Tạo order item
        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          deposit: product.deposit || 0,
        });
        orderItems.push(orderItem);
      }

      // Tạo mã đơn hàng
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Tạo đơn hàng
      const order = queryRunner.manager.create(Order, {
        userId,
        orderNumber,
        totalPrice,
        totalDeposit,
        rentalStartDate: new Date(createOrderDto.rentalStartDate),
        rentalEndDate: new Date(createOrderDto.rentalEndDate),
        rentalAddress: createOrderDto.rentalAddress,
        notes: createOrderDto.notes,
        status: OrderStatus.PENDING,
        orderItems,
      });

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(userId?: string): Promise<Order[]> {
    const where = userId ? { userId } : {};
    return this.ordersRepository.find({
      where,
      relations: ['user', 'orderItems', 'orderItems.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['user', 'orderItems', 'orderItems.product'],
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    Object.assign(order, updateOrderDto);
    return this.ordersRepository.save(order);
  }

  async cancel(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã bị hủy');
    }

    if (order.status === OrderStatus.RETURNED) {
      throw new BadRequestException('Không thể hủy đơn hàng đã hoàn trả');
    }

    // Hoàn trả số lượng sản phẩm
    for (const item of order.orderItems) {
      const product = await this.productsRepository.findOne({
        where: { id: item.productId },
      });
      if (product) {
        product.quantity += item.quantity;
        product.isAvailable = true;
        await this.productsRepository.save(product);
      }
    }

    order.status = OrderStatus.CANCELLED;
    return this.ordersRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
  }
}

