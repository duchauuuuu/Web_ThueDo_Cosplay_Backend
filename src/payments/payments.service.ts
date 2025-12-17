import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../entities/order.entity';

@Injectable()
export class PaymentsService {
  private sepayApiUrl: string;
  private sepayApiKey: string;
  private sepayApiSecret: string;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    private ordersService: OrdersService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.sepayApiUrl = this.configService.get<string>('SEPAY_API_URL') || 'https://api.sepay.vn';
    this.sepayApiKey = this.configService.get<string>('SEPAY_API_KEY') || '';
    this.sepayApiSecret = this.configService.get<string>('SEPAY_API_SECRET') || '';
  }

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const order = await this.ordersService.findOne(createPaymentDto.orderId);

    if (order.status !== 'pending') {
      throw new BadRequestException('Đơn hàng không ở trạng thái pending');
    }

    // Tạo payment record
    const payment = this.paymentsRepository.create({
      orderId: createPaymentDto.orderId,
      amount: order.totalPrice + (order.totalDeposit || 0),
      method: createPaymentDto.method || PaymentMethod.SEPAY,
      status: PaymentStatus.PENDING,
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    // Nếu là SePay, tạo payment link
    if (savedPayment.method === PaymentMethod.SEPAY) {
      try {
        const paymentLink = await this.createSepayPaymentLink(savedPayment, order);
        savedPayment.sepayOrderId = paymentLink.orderId || paymentLink.data?.orderId;
        savedPayment.callbackUrl = paymentLink.callbackUrl || paymentLink.data?.callbackUrl;
        // Lưu toàn bộ response từ SePay để có thể lấy QR code sau
        savedPayment.sepayResponse = JSON.stringify(paymentLink);
        return this.paymentsRepository.save(savedPayment);
      } catch (error) {
        savedPayment.status = PaymentStatus.FAILED;
        await this.paymentsRepository.save(savedPayment);
        throw new BadRequestException('Không thể tạo payment link từ SePay');
      }
    }

    return savedPayment;
  }

  private async createSepayPaymentLink(payment: Payment, order: any): Promise<any> {
    const callbackUrl = `${this.configService.get<string>('BASE_URL') || 'http://localhost:3000'}/payments/callback`;
    
    const payload = {
      amount: payment.amount,
      orderId: payment.id,
      orderInfo: `Thanh toan don hang ${order.orderNumber}`,
      callbackUrl: callbackUrl,
      returnUrl: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/payment/success`,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.sepayApiKey}`,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.sepayApiUrl}/v1/payments`, payload, { headers }),
      );
      return response.data;
    } catch (error: any) {
      console.error('SePay API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async handleCallback(data: any): Promise<Payment> {
    const { orderId, status, transactionId } = data;

    const payment = await this.paymentsRepository.findOne({
      where: { id: orderId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy payment');
    }

    payment.transactionId = transactionId;
    payment.sepayResponse = JSON.stringify(data);

    if (status === 'success' || status === 'completed') {
      payment.status = PaymentStatus.COMPLETED;
      // Cập nhật trạng thái đơn hàng
      if (payment.order) {
        await this.ordersService.update(payment.order.id, {
          status: OrderStatus.CONFIRMED,
        });
      }
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    return this.paymentsRepository.save(payment);
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['order'],
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy payment với ID: ${id}`);
    }
    return payment;
  }

  async findByOrder(orderId: string): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }
}

