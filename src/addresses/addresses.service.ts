import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { Address } from '../entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressesRepository: Repository<Address>,
    private dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<Address> {
    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
    if (createAddressDto.isDefault) {
      await this.addressesRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const address = this.addressesRepository.create({
      ...createAddressDto,
      userId,
    });

    return this.addressesRepository.save(address);
  }

  async findAll(userId: string): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { userId, isActive: true },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string, userId: string): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID: ${id}`);
    }
    return address;
  }

  async update(
    id: string,
    userId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.findOne(id, userId);

    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
    if (updateAddressDto.isDefault) {
      await this.addressesRepository.update(
        { userId, isDefault: true, id: Not(id) },
        { isDefault: false },
      );
    }

    Object.assign(address, updateAddressDto);
    return this.addressesRepository.save(address);
  }

  async remove(id: string, userId: string): Promise<void> {
    const address = await this.findOne(id, userId);
    await this.addressesRepository.remove(address);
  }

  async setDefault(id: string, userId: string): Promise<Address> {
    const address = await this.findOne(id, userId);

    // Bỏ mặc định của các địa chỉ khác
    await this.addressesRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Đặt địa chỉ này làm mặc định
    address.isDefault = true;
    return this.addressesRepository.save(address);
  }

  async getDefault(userId: string): Promise<Address | null> {
    return this.addressesRepository.findOne({
      where: { userId, isDefault: true, isActive: true },
    });
  }
}

