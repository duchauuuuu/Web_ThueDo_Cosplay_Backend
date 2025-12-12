import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher, VoucherDiscountType } from '../entities/voucher.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
  ) {}

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    await this.ensureCodeUnique(dto.code);

    const voucher = this.voucherRepository.create({
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      usageLimit: dto.usageLimit ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.voucherRepository.save(voucher);
  }

  findAll(): Promise<Voucher[]> {
    return this.voucherRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher');
    }
    return voucher;
  }

  async update(id: string, dto: UpdateVoucherDto): Promise<Voucher> {
    const voucher = await this.findOne(id);

    if (dto.code && dto.code !== voucher.code) {
      await this.ensureCodeUnique(dto.code);
    }

    Object.assign(voucher, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : voucher.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : voucher.endDate,
    });

    return this.voucherRepository.save(voucher);
  }

  async remove(id: string): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepository.remove(voucher);
  }

  private async ensureCodeUnique(code: string) {
    const exists = await this.voucherRepository.findOne({ where: { code } });
    if (exists) {
      throw new BadRequestException('Mã voucher đã tồn tại');
    }
  }
}

