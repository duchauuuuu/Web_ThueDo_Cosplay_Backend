import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    private ordersService: OrdersService,
    private paymentsService: PaymentsService,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    // Kiểm tra order tồn tại
    const order = await this.ordersService.findOne(createInvoiceDto.orderId);

    // Kiểm tra payment nếu có
    if (createInvoiceDto.paymentId) {
      await this.paymentsService.findOne(createInvoiceDto.paymentId);
    }

    // Tính toán subtotal từ order
    const subtotal = order.totalPrice + (order.totalDeposit || 0);
    const tax = createInvoiceDto.tax || 0;
    const discount = createInvoiceDto.discount || 0;
    const total = subtotal + tax - discount;

    // Tạo mã hóa đơn duy nhất
    const invoiceNumber = `INV-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Lấy thông tin user từ order
    const user = order.user;

    // Tạo invoice
    const invoice = this.invoicesRepository.create({
      invoiceNumber,
      orderId: createInvoiceDto.orderId,
      paymentId: createInvoiceDto.paymentId || undefined,
      userId: order.userId,
      subtotal,
      tax,
      discount,
      total,
      status: createInvoiceDto.status || InvoiceStatus.DRAFT,
      issuedDate: new Date(createInvoiceDto.issuedDate),
      dueDate: createInvoiceDto.dueDate
        ? new Date(createInvoiceDto.dueDate)
        : undefined,
      notes: createInvoiceDto.notes || undefined,
      companyName: createInvoiceDto.companyName || undefined,
      companyAddress: createInvoiceDto.companyAddress || undefined,
      companyTaxCode: createInvoiceDto.companyTaxCode || undefined,
      customerName: createInvoiceDto.customerName || user.fullName,
      customerEmail: createInvoiceDto.customerEmail || user.email || undefined,
      customerPhone: createInvoiceDto.customerPhone || user.phone || undefined,
      customerAddress: createInvoiceDto.customerAddress || user.address || undefined,
    });

    return this.invoicesRepository.save(invoice);
  }

  async findAll(userId?: string): Promise<Invoice[]> {
    const where = userId ? { userId } : {};
    return this.invoicesRepository.find({
      where,
      relations: ['order', 'payment', 'user', 'order.orderItems', 'order.orderItems.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id },
      relations: ['order', 'payment', 'user', 'order.orderItems', 'order.orderItems.product'],
    });
    if (!invoice) {
      throw new NotFoundException(`Không tìm thấy hóa đơn với ID: ${id}`);
    }
    return invoice;
  }

  async findByOrder(orderId: string): Promise<Invoice[]> {
    return this.invoicesRepository.find({
      where: { orderId },
      relations: ['order', 'payment', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { invoiceNumber },
      relations: ['order', 'payment', 'user', 'order.orderItems', 'order.orderItems.product'],
    });
    if (!invoice) {
      throw new NotFoundException(
        `Không tìm thấy hóa đơn với mã: ${invoiceNumber}`,
      );
    }
    return invoice;
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // Nếu đã thanh toán, không cho phép chỉnh sửa
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Không thể chỉnh sửa hóa đơn đã thanh toán');
    }

    // Cập nhật các trường
    if (updateInvoiceDto.tax !== undefined) {
      invoice.tax = updateInvoiceDto.tax;
    }
    if (updateInvoiceDto.discount !== undefined) {
      invoice.discount = updateInvoiceDto.discount;
    }
    if (updateInvoiceDto.tax !== undefined || updateInvoiceDto.discount !== undefined) {
      // Tính lại total
      invoice.total = invoice.subtotal + invoice.tax - invoice.discount;
    }

    if (updateInvoiceDto.issuedDate) {
      invoice.issuedDate = new Date(updateInvoiceDto.issuedDate);
    }
    if (updateInvoiceDto.dueDate !== undefined) {
      invoice.dueDate = updateInvoiceDto.dueDate
        ? new Date(updateInvoiceDto.dueDate)
        : null;
    }
    if (updateInvoiceDto.notes !== undefined) {
      invoice.notes = updateInvoiceDto.notes;
    }
    if (updateInvoiceDto.status) {
      invoice.status = updateInvoiceDto.status;
    }
    if (updateInvoiceDto.companyName !== undefined) {
      invoice.companyName = updateInvoiceDto.companyName;
    }
    if (updateInvoiceDto.companyAddress !== undefined) {
      invoice.companyAddress = updateInvoiceDto.companyAddress;
    }
    if (updateInvoiceDto.companyTaxCode !== undefined) {
      invoice.companyTaxCode = updateInvoiceDto.companyTaxCode;
    }
    if (updateInvoiceDto.customerName !== undefined) {
      invoice.customerName = updateInvoiceDto.customerName;
    }
    if (updateInvoiceDto.customerEmail !== undefined) {
      invoice.customerEmail = updateInvoiceDto.customerEmail;
    }
    if (updateInvoiceDto.customerPhone !== undefined) {
      invoice.customerPhone = updateInvoiceDto.customerPhone;
    }
    if (updateInvoiceDto.customerAddress !== undefined) {
      invoice.customerAddress = updateInvoiceDto.customerAddress;
    }

    return this.invoicesRepository.save(invoice);
  }

  async markAsPaid(id: string, paymentId?: string): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn đã được thanh toán');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Không thể thanh toán hóa đơn đã hủy');
    }

    invoice.status = InvoiceStatus.PAID;
    if (paymentId) {
      // Kiểm tra payment tồn tại
      await this.paymentsService.findOne(paymentId);
      invoice.paymentId = paymentId;
    }

    return this.invoicesRepository.save(invoice);
  }

  async cancel(id: string): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Không thể hủy hóa đơn đã thanh toán');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Hóa đơn đã bị hủy');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    return this.invoicesRepository.save(invoice);
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.findOne(id);
    await this.invoicesRepository.remove(invoice);
  }
}

