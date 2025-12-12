import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { User } from './user.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string; // Mã hóa đơn duy nhất

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column({ nullable: true })
  paymentId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number; // Tổng tiền hàng (chưa tính thuế, giảm giá)

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  tax: number; // Thuế VAT (mặc định 0)

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discount: number; // Giảm giá (mặc định 0)

  @Column('decimal', { precision: 10, scale: 2 })
  total: number; // Tổng cộng (subtotal + tax - discount)

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'date' })
  issuedDate: Date; // Ngày phát hành hóa đơn

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null; // Ngày hết hạn thanh toán

  @Column({ nullable: true, type: 'text' })
  notes: string; // Ghi chú

  // Thông tin công ty (nếu cần xuất hóa đơn VAT)
  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true, type: 'text' })
  companyAddress: string;

  @Column({ nullable: true })
  companyTaxCode: string;

  // Thông tin khách hàng trên hóa đơn
  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true, type: 'text' })
  customerAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

