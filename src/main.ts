import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase payload size for file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // forbidNonWhitelisted: true, // Tắt để cho phép query params không có trong DTO
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('API Thuê Đồ Cosplay')
    .setDescription('API cho hệ thống thuê đồ cosplay')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Xác thực người dùng')
    .addTag('Users', 'Quản lý người dùng')
    .addTag('Categories', 'Quản lý danh mục')
    .addTag('Products', 'Quản lý sản phẩm')
    .addTag('Orders', 'Quản lý đơn hàng')
    .addTag('Comments', 'Bình luận và đánh giá')
    .addTag('Payments', 'Thanh toán')
    .addTag('Upload', 'Upload ảnh')
    .addTag('Favorites', 'Danh sách yêu thích')
    .addTag('Addresses', 'Quản lý địa chỉ')
    .addTag('Product Images', 'Quản lý ảnh sản phẩm')
    .addTag('Seed', 'Seed dữ liệu mẫu')
    .addTag('Invoices', 'Quản lý hóa đơn')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 8081;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
