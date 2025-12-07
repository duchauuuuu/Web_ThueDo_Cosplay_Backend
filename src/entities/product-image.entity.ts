import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string; // URL từ Cloudinary

  @Column({ nullable: true })
  publicId: string; // Public ID từ Cloudinary

  @Column({ nullable: true })
  alt: string; // Alt text cho ảnh

  @Column({ default: 0 })
  order: number; // Thứ tự hiển thị

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Product, (product) => product.productImages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column()
  productId: string;

  @CreateDateColumn()
  createdAt: Date;
}

