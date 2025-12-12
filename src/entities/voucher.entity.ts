import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VoucherDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: VoucherDiscountType,
    default: VoucherDiscountType.PERCENT,
  })
  discountType: VoucherDiscountType;

  // Giá trị giảm: nếu percent thì 0-100, nếu fixed thì đơn vị tiền tệ
  @Column('decimal', { precision: 10, scale: 2 })
  discountValue: number;

  // Giảm tối đa khi áp dụng phần trăm (optional)
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  maxDiscount?: number;

  // Giá trị đơn hàng tối thiểu để áp dụng voucher (optional)
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minOrderValue?: number;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  // Số lượt tối đa được dùng tổng cộng
  @Column({ type: 'int', default: 0 })
  usageLimit: number;

  // Số lượt đã dùng
  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

