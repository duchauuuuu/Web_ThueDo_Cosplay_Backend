import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Address } from '../entities/address.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { Comment } from '../entities/comment.entity';
import { Favorite } from '../entities/favorite.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Product,
      ProductImage,
      Address,
      Order,
      OrderItem,
      Payment,
      Comment,
      Favorite,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}

