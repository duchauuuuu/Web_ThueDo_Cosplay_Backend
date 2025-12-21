import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { Order, OrderStatus } from '../entities/order.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private sepayApiUrl: string;
  private sepayApiKey: string;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private ordersService: OrdersService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    // SePay API URL - có thể là https://sepay.vn/api hoặc URL khác tùy theo tài liệu
    this.sepayApiUrl = this.configService.get<string>('SEPAY_API_URL') || 'https://sepay.vn/api';
    this.sepayApiKey = this.configService.get<string>('SEPAY_API_KEY') || '';
    
    if (!this.sepayApiKey) {
      this.logger.warn('SEPAY_API_KEY chưa được cấu hình trong .env file');
    }
  }

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      this.logger.log(`Creating payment for order: ${createPaymentDto.orderId}`);
      
      const order = await this.ordersService.findOne(createPaymentDto.orderId);
      
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (order.status !== 'pending') {
        throw new BadRequestException('Đơn hàng không ở trạng thái pending');
      }

      // Tính toán amount - đảm bảo convert sang number và format đúng
      const parseAmount = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') {
          return isNaN(value) ? 0 : value;
        }
        if (typeof value === 'string') {
          // Remove all non-numeric characters except decimal point
          const cleaned = value.replace(/[^\d.]/g, '');
          // Only keep first decimal point
          const parts = cleaned.split('.');
          const numStr = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
          const parsed = parseFloat(numStr);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };
      
      const totalPrice = parseAmount(order.totalPrice);
      const totalDeposit = parseAmount(order.totalDeposit);
      const amount = parseFloat((totalPrice + totalDeposit).toFixed(2));
      
      if (amount <= 0 || isNaN(amount)) {
        throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
      }

      this.logger.log(`Payment amount: ${amount} (totalPrice: ${totalPrice}, totalDeposit: ${totalDeposit})`);

      // Tạo payment record
      const payment = this.paymentsRepository.create({
        orderId: createPaymentDto.orderId,
        amount: amount,
        method: createPaymentDto.method || PaymentMethod.SEPAY,
        status: PaymentStatus.PENDING,
      });

      const savedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`Payment created: ${savedPayment.id}`);

      // Nếu là SePay, tạo QR code URL theo format SePay (không cần gọi API)
      if (savedPayment.method === PaymentMethod.SEPAY) {
        try {
          this.logger.log('Creating SePay QR code...');
          
          // Thông tin tài khoản ngân hàng cố định
          const bankAccount = {
            accountNo: '109876820087',
            bankCode: 'ICB',
            bankName: 'Ngân hàng TMCP Công Thương Việt Nam',
            accountName: 'NGUYEN DUC HAU',
            template: 'compact2', // Template mặc định của SePay
          };
          
          // Làm tròn số tiền về số nguyên (VND không có decimal) - giống Java code
          // Đảm bảo là số nguyên, không có decimal
          const fixedAmount = parseInt(amount.toString(), 10);
          
          // Tạo orderInfo từ orderNumber hoặc orderId - phải có SEVQR
          const orderNumber = order.orderNumber || order.id.substring(0, 8).toUpperCase();
          const orderInfo = `SEVQR THANH TOAN DON HANG ${orderNumber}`;
          
          // Tạo QR code URL theo format SePay
          // Format: https://qr.sepay.vn/img?acc={accountNo}&bank={bankCode}&amount={amount}&des={orderInfo}&template={template}
          const qrCodeUrl = `https://qr.sepay.vn/img?acc=${bankAccount.accountNo}&bank=${bankAccount.bankCode}&amount=${fixedAmount}&des=${encodeURIComponent(orderInfo)}&template=${bankAccount.template}`;
          
          this.logger.log(`SePay QR URL created: ${qrCodeUrl}`);
          
          // Lưu thông tin vào sepayResponse để frontend có thể lấy
          const qrData = {
            qrCodeUrl: qrCodeUrl,
            accountNumber: bankAccount.accountNo,
            bankCode: bankAccount.bankCode,
            bankName: bankAccount.bankName,
            accountName: bankAccount.accountName,
            amount: fixedAmount,
            orderNumber: orderNumber,
            orderInfo: orderInfo,
          };
          
          savedPayment.sepayResponse = JSON.stringify(qrData);
          savedPayment.sepayOrderId = savedPayment.id; // Dùng payment ID làm orderId cho webhook
          
          const savedPaymentWithQR = await this.paymentsRepository.save(savedPayment);
          
          this.logger.log('SePay QR code created successfully');
          
          return Object.assign(savedPaymentWithQR, { 
            qrCodeUrl: qrCodeUrl,
            accountNumber: bankAccount.accountNo,
            bankCode: bankAccount.bankCode,
            bankName: bankAccount.bankName,
            accountName: bankAccount.accountName,
            orderInfo: orderInfo,
          }) as any;
        } catch (error: any) {
          this.logger.error('Error creating SePay QR code:', error);
          savedPayment.status = PaymentStatus.FAILED;
          await this.paymentsRepository.save(savedPayment);
          throw new BadRequestException(`Không thể tạo QR code: ${error.message}`);
        }
      }

      return savedPayment;
    } catch (error: any) {
      this.logger.error('Error in createPayment:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Lỗi khi tạo payment: ${error.message}`);
    }
  }

  private async createSepayPaymentLink(payment: Payment, order: any): Promise<any> {
    if (!this.sepayApiKey) {
      throw new BadRequestException('SEPAY_API_KEY chưa được cấu hình');
    }

    const callbackUrl = `${this.configService.get<string>('BASE_URL') || 'http://localhost:8081'}/payments/callback`;
    const returnUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/payment/success`;
    
    const orderNumber = order.orderNumber || order.id.substring(0, 8).toUpperCase();
    const payload = {
      amount: payment.amount,
      orderId: payment.id,
      orderInfo: `SEVQR THANH TOAN DON HANG ${orderNumber}`,
      callbackUrl: callbackUrl,
      returnUrl: returnUrl,
    };

    this.logger.log(`Calling SePay API: ${this.sepayApiUrl}/v1/payments`);
    this.logger.log(`Payload:`, JSON.stringify(payload));

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.sepayApiKey}`,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.sepayApiUrl}/v1/payments`, payload, { headers }),
      );
      this.logger.log('SePay API Response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      const errorResponse = error.response?.data;
      
      this.logger.error('SePay API Error:', errorResponse || errorMessage);
      this.logger.error('SePay API URL:', this.sepayApiUrl);
      this.logger.error('SePay API Error Status:', error.response?.status);
      
      // Nếu là lỗi DNS/network, thông báo rõ ràng hơn
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        throw new BadRequestException(
          `Không thể kết nối đến SePay API (${this.sepayApiUrl}). Vui lòng kiểm tra SEPAY_API_URL trong file .env hoặc kết nối mạng.`
        );
      }
      
      throw error;
    }
  }

  /**
   * Xử lý webhook callback từ SePay
   */
  async handleCallback(data: any): Promise<Payment> {
    this.logger.log('Nhận webhook từ SePay:', JSON.stringify(data));

    // Parse orderId từ content nếu không có orderId trực tiếp
    let orderId = data.orderId;
    let payment: Payment | null = null;
    
    // Nếu không có orderId, thử parse từ content field
    if (!orderId && data.content) {
      // Format: "111714357654-0786012569-SEVQR THANH TOAN DON HANG ORD1766328988597QMNHV23PX"
      // Hoặc: "SEVQR THANH TOAN DON HANG ORD1766328988597QMNHV23PX"
      const content = data.content;
      const sevqrMatch = content.match(/SEVQR\s+THANH\s+TOAN\s+DON\s+HANG\s+(.+)/i);
      if (sevqrMatch && sevqrMatch[1]) {
        // Extract order number từ content
        const orderNumberFromContent = sevqrMatch[1].trim();
        this.logger.log(`Parsed orderNumber from content: ${orderNumberFromContent}`);
        
        // Tìm payment theo orderNumber trong sepayResponse (vì orderNumber được lưu trong sepayResponse)
        const allPayments = await this.paymentsRepository.find({
          relations: ['order'],
        });
        
        for (const p of allPayments) {
          if (p.sepayResponse) {
            try {
              const sepayData = JSON.parse(p.sepayResponse);
              if (sepayData.orderNumber) {
                // So sánh orderNumber bỏ qua dấu gạch ngang
                const normalizedContentOrderNumber = orderNumberFromContent.replace(/-/g, '').toUpperCase();
                const normalizedSavedOrderNumber = sepayData.orderNumber.replace(/-/g, '').toUpperCase();
                
                if (normalizedContentOrderNumber === normalizedSavedOrderNumber ||
                    normalizedContentOrderNumber.includes(normalizedSavedOrderNumber) ||
                    normalizedSavedOrderNumber.includes(normalizedContentOrderNumber)) {
                  payment = p;
                  orderId = p.id;
                  this.logger.log(`Found payment by orderNumber in sepayResponse: ${p.id}`);
                  break;
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        
        // Nếu không tìm thấy trong sepayResponse, thử tìm order theo orderNumber
        if (!payment) {
          // Tìm tất cả orders và kiểm tra orderNumber
          const orders = await this.ordersRepository.find({
            where: {},
          });
          
          for (const order of orders) {
            // So sánh orderNumber (có thể format khác nhau)
            if (order.orderNumber && (
              order.orderNumber === orderNumberFromContent ||
              order.orderNumber.replace(/-/g, '') === orderNumberFromContent.replace(/-/g, '') ||
              orderNumberFromContent.includes(order.orderNumber) ||
              order.orderNumber.includes(orderNumberFromContent)
            )) {
              // Tìm payment theo orderId
              payment = await this.paymentsRepository.findOne({
                where: { orderId: order.id },
                relations: ['order'],
              });
              if (payment) {
                orderId = payment.id;
                this.logger.log(`Found payment by orderNumber via order lookup: ${payment.id}`);
                break;
              }
            }
          }
        }
      }
    }

    // Nếu vẫn không có orderId, thử parse từ referenceCode hoặc id
    if (!orderId && !payment) {
      if (data.referenceCode) {
        orderId = data.referenceCode;
      } else if (data.id) {
        orderId = data.id.toString();
      }
    }

    // Xác định status từ transferType và transferAmount
    // transferType: "in" = đã nhận tiền, transferAmount > 0 = thành công
    let status = data.status;
    if (!status) {
      if (data.transferType === 'in' && data.transferAmount > 0) {
        status = 'completed';
      } else {
        status = 'pending';
      }
    }

    // Tìm payment nếu chưa tìm thấy
    if (!payment) {
      // Tìm payment theo orderId (có thể là payment.id hoặc sepayOrderId)
      payment = await this.paymentsRepository.findOne({
        where: { id: orderId },
        relations: ['order'],
      });

      // Nếu không tìm thấy, thử tìm theo sepayOrderId
      if (!payment && orderId) {
        payment = await this.paymentsRepository.findOne({
          where: { sepayOrderId: orderId },
          relations: ['order'],
        });
      }
    }

    if (!payment) {
      this.logger.error(`Không tìm thấy payment với orderId: ${orderId}`);
      throw new NotFoundException('Không tìm thấy payment');
    }

    // Lấy amount và transactionId từ data
    const amount = data.amount || data.transferAmount;
    const transactionId = data.transactionId || data.referenceCode || data.id?.toString();

    // Kiểm tra amount nếu có
    if (amount && parseFloat(amount.toString()) !== parseFloat(payment.amount.toString())) {
      this.logger.warn(
        `Amount không khớp: webhook=${amount}, payment=${payment.amount}`,
      );
    }

    // Cập nhật thông tin payment
    payment.transactionId = transactionId || payment.transactionId;
    payment.sepayResponse = JSON.stringify(data);

    // Xử lý trạng thái
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === 'success' || normalizedStatus === 'completed' || normalizedStatus === 'paid') {
      payment.status = PaymentStatus.COMPLETED;
      
      // Cập nhật trạng thái đơn hàng
      if (payment.order && payment.order.status !== OrderStatus.CONFIRMED) {
        await this.ordersService.update(payment.order.id, {
          status: OrderStatus.CONFIRMED,
        });
        this.logger.log(`Đã cập nhật đơn hàng ${payment.order.id} sang trạng thái CONFIRMED`);
      }
    } else if (normalizedStatus === 'failed' || normalizedStatus === 'cancelled') {
      payment.status = PaymentStatus.FAILED;
    } else {
      this.logger.warn(`Trạng thái không xác định: ${status}`);
    }

    const savedPayment = await this.paymentsRepository.save(payment);
    this.logger.log(`Đã cập nhật payment ${savedPayment.id} với trạng thái ${savedPayment.status}`);

    return savedPayment;
  }

  async findOne(id: string): Promise<any> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['order'],
    });
    if (!payment) {
      throw new NotFoundException(`Không tìm thấy payment với ID: ${id}`);
    }
    
    // Nếu có sepayResponse, parse và trả về QR code và orderInfo
    let qrCode = null;
    let qrCodeUrl = null;
    let orderInfo = null;
    if (payment.sepayResponse) {
      try {
        const sepayData = JSON.parse(payment.sepayResponse);
        qrCode = sepayData.qrCode || sepayData.data?.qrCode || sepayData.qrcode || sepayData.data?.qrcode;
        qrCodeUrl = sepayData.qrCodeUrl || sepayData.data?.qrCodeUrl || sepayData.qrCodeImage || sepayData.data?.qrCodeImage;
        orderInfo = sepayData.orderInfo || null;
      } catch (error) {
        this.logger.warn('Không thể parse sepayResponse:', error);
      }
    }
    
    return Object.assign(payment, { qrCode, qrCodeUrl, orderInfo });
  }

  async findByOrder(orderId: string): Promise<any[]> {
    const payments = await this.paymentsRepository.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
    
    // Thêm QR code và orderInfo vào mỗi payment
    return payments.map(payment => {
      let qrCode = null;
      let qrCodeUrl = null;
      let orderInfo = null;
      
      if (payment.sepayResponse) {
        try {
          const sepayData = JSON.parse(payment.sepayResponse);
          qrCode = sepayData.qrCode || sepayData.data?.qrCode || sepayData.qrcode || sepayData.data?.qrcode;
          qrCodeUrl = sepayData.qrCodeUrl || sepayData.data?.qrCodeUrl || sepayData.qrCodeImage || sepayData.data?.qrCodeImage;
          orderInfo = sepayData.orderInfo || null;
        } catch (error) {
          this.logger.warn('Không thể parse sepayResponse:', error);
        }
      }
      
      return Object.assign(payment, { qrCode, qrCodeUrl, orderInfo });
    });
  }
}

