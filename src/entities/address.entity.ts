import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string; // Tên người nhận

  @Column()
  phone: string; // Số điện thoại

  @Column()
  address: string; // Địa chỉ chi tiết

  @Column({ nullable: true })
  ward: string; // Phường/Xã

  @Column({ nullable: true })
  district: string; // Quận/Huyện

  @Column({ nullable: true })
  province: string; // Tỉnh/Thành phố

  @Column({ nullable: true })
  postalCode: string; // Mã bưu điện

  @Column({ default: false })
  isDefault: boolean; // Địa chỉ mặc định

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, (user) => user.addresses)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

