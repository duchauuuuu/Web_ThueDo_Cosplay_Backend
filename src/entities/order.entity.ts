import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Comment } from './comment.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RENTED = 'rented',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string; // Mã đơn hàng

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalDeposit: number;

  @Column({ type: 'date' })
  rentalStartDate: Date; // Ngày bắt đầu thuê

  @Column({ type: 'date' })
  rentalEndDate: Date; // Ngày kết thúc thuê

  @Column({ nullable: true })
  rentalAddress: string; // Địa chỉ giao hàng

  @Column({ nullable: true })
  notes: string; // Ghi chú

  @Column({ nullable: true })
  paymentMethod: string; // Phương thức thanh toán (cod, cash, bank_transfer, etc.)

  @Column({ nullable: true })
  paymentStatus: string; // Trạng thái thanh toán (pending, paid, completed, etc.)

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  orderItems: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => Comment, (comment) => comment.order)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

