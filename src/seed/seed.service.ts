import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Address } from '../entities/address.entity';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../entities/payment.entity';
import { Comment } from '../entities/comment.entity';
import { Favorite } from '../entities/favorite.entity';
import { Voucher, VoucherDiscountType } from '../entities/voucher.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private productImagesRepository: Repository<ProductImage>,
    @InjectRepository(Address)
    private addressesRepository: Repository<Address>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Favorite)
    private favoritesRepository: Repository<Favorite>,
    @InjectRepository(Voucher)
    private vouchersRepository: Repository<Voucher>,
  ) {}

  async seed() {
    try {
      console.log('🌱 Bắt đầu seed dữ liệu...');

      // Clear existing data (optional - chỉ trong development)
      await this.clearData();

      // Seed Users
      const users = await this.seedUsers();
      console.log(`✅ Đã tạo ${users.length} users`);

      // Seed Categories
      const categories = await this.seedCategories();
      console.log(`✅ Đã tạo ${categories.length} categories`);
      console.log('📋 Categories:', categories.map(c => ({ id: c.id, name: c.name })));

      // Seed Products
      const products = await this.seedProducts(categories);
      console.log(`✅ Đã tạo ${products.length} products`);
      console.log('📋 Products:', products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));

      // Verify products in database
      const allProducts = await this.productsRepository.find();
      console.log(`🔍 Verify: Database hiện có ${allProducts.length} products (isActive: ${allProducts.filter(p => p.isActive).length})`);

      // Seed Product Images
      await this.seedProductImages(products);
      console.log(`✅ Đã tạo product images`);

      // Seed Addresses
      await this.seedAddresses(users);
      console.log(`✅ Đã tạo addresses`);

      // Seed Favorites
      const favorites = await this.seedFavorites(users, products);
      console.log(`✅ Đã tạo ${favorites.length} favorites`);

      // Seed Orders
      const orders = await this.seedOrders(users, products);
      console.log(`✅ Đã tạo ${orders.length} orders`);

      // Seed Payments
      const payments = await this.seedPayments(orders);
      console.log(`✅ Đã tạo ${payments.length} payments`);

      // Seed Comments
      const comments = await this.seedComments(users, orders);
      console.log(`✅ Đã tạo ${comments.length} comments`);

      // Seed Vouchers
      const vouchers = await this.seedVouchers();
      console.log(`✅ Đã tạo ${vouchers.length} vouchers`);

      console.log('🎉 Hoàn thành seed dữ liệu!');
      
      return {
        success: true,
        counts: {
          users: users.length,
          categories: categories.length,
          products: products.length,
          productsInDb: allProducts.length,
          activeProducts: allProducts.filter(p => p.isActive).length,
          favorites: favorites.length,
          orders: orders.length,
          payments: payments.length,
          comments: comments.length,
          vouchers: vouchers.length,
        }
      };
    } catch (error) {
      console.error('❌ Lỗi khi seed dữ liệu:', error);
      throw error;
    }
  }

  private async clearData() {
    // Xóa theo thứ tự để tránh lỗi foreign key
    await this.commentsRepository.createQueryBuilder().delete().execute();
    await this.paymentsRepository.createQueryBuilder().delete().execute();
    await this.orderItemsRepository.createQueryBuilder().delete().execute();
    await this.ordersRepository.createQueryBuilder().delete().execute();
    await this.favoritesRepository.createQueryBuilder().delete().execute();
    await this.vouchersRepository.createQueryBuilder().delete().execute();
    await this.productImagesRepository.createQueryBuilder().delete().execute();
    await this.addressesRepository.createQueryBuilder().delete().execute();
    await this.productsRepository.createQueryBuilder().delete().execute();
    await this.categoriesRepository.createQueryBuilder().delete().execute();
    await this.usersRepository.createQueryBuilder().delete().execute();
    console.log('🗑️  Đã xóa dữ liệu cũ');
  }

  private async seedUsers(): Promise<User[]> {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const users = [
      {
        email: 'admin@gmail.com',
        password: hashedPassword,
        fullName: 'Admin Cosplay',
        phone: '0123456789',
        role: UserRole.ADMIN,
        isActive: true,
      },
      {
        email: 'user1@gmail.com',
        password: hashedPassword,
        fullName: 'Nguyễn Văn A',
        phone: '0987654321',
        role: UserRole.USER,
        isActive: true,
      },
      {
        email: 'user2@gmail.com',
        password: hashedPassword,
        fullName: 'Trần Thị B',
        phone: '0912345678',
        role: UserRole.USER,
        isActive: true,
      },
    ];

    const createdUsers = await Promise.all(
      users.map((userData) => {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
      }),
    );

    return createdUsers;
  }

  private async seedCategories(): Promise<Category[]> {
    const categories = [
      {
        name: 'Anime',
        description: 'Trang phục cosplay các nhân vật anime nổi tiếng',
        image: '/img_clothes/anime/Akatsuki truyện naruto (4).jpg',
        isActive: true,
      },
      {
        name: 'Manga',
        description: 'Trang phục cosplay từ các bộ manga',
        image: '/img_clothes/coTich/000aa6833cdc1c0415c4b11a8495510d.jpg',
        isActive: true,
      },
      {
        name: 'Game',
        description: 'Trang phục cosplay nhân vật game',
        image: '/img_clothes/anime/Boa Hancok One Piece (4)-min.jpg',
        isActive: true,
      },
      {
        name: 'K-Pop',
        description: 'Trang phục cosplay K-Pop idols',
        image: '/img_clothes/dongPhucHocSinh/1.jpg',
        isActive: true,
      },
      {
        name: 'Western',
        description: 'Trang phục cosplay phim phương Tây',
        image: '/img_clothes/coTrang/2f15ae551b1a2273725028f64955a607.jpg',
        isActive: true,
      },
    ];

    const createdCategories = await Promise.all(
      categories.map((categoryData) => {
        const category = this.categoriesRepository.create(categoryData);
        return this.categoriesRepository.save(category);
      }),
    );

    return createdCategories;
  }

  private async seedProducts(categories: Category[]): Promise<Product[]> {
    const products = [
      {
        name: 'Cosplay Naruto - Áo khoác Akatsuki',
        description:
          'Áo khoác Akatsuki chính hãng, chất liệu cao cấp, size M-L-XL. Phù hợp cho cosplay Naruto, Sasuke, Itachi...',
        price: 250000,
        deposit: 100000,
        quantity: 5,
        size: 'M, L, XL',
        color: 'Đỏ đen',
        brand: 'Cosplay Pro',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Demon Slayer - Kimono Tanjiro',
        description:
          'Kimono Tanjiro Kamado với họa tiết đặc trưng, chất liệu vải mềm mại, size S-M-L.',
        price: 300000,
        deposit: 150000,
        quantity: 3,
        size: 'S, M, L',
        color: 'Xanh lá, đen',
        brand: 'Anime Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay One Piece - Áo khoác Luffy',
        description:
          'Áo khoác Straw Hat Pirates, chất liệu bền, size M-L-XL. Kèm theo mũ rơm.',
        price: 280000,
        deposit: 120000,
        quantity: 4,
        size: 'M, L, XL',
        color: 'Đỏ, vàng',
        brand: 'Pirate Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Attack on Titan - Survey Corps Uniform',
        description:
          'Đồng phục Survey Corps với áo khoác và đai da, size S-M-L-XL. Chất liệu cao cấp.',
        price: 350000,
        deposit: 150000,
        quantity: 2,
        size: 'S, M, L, XL',
        color: 'Nâu, trắng',
        brand: 'Titan Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Jujutsu Kaisen - Uniform Gojo',
        description:
          'Đồng phục Jujutsu High với áo khoác và kính đen, size M-L. Chất liệu tốt.',
        price: 320000,
        deposit: 150000,
        quantity: 3,
        size: 'M, L',
        color: 'Xanh dương, trắng',
        brand: 'Jujutsu Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Genshin Impact - Outfit Hu Tao',
        description:
          'Trang phục Hu Tao từ Genshin Impact, đầy đủ phụ kiện, size S-M.',
        price: 450000,
        deposit: 200000,
        quantity: 2,
        size: 'S, M',
        color: 'Đỏ, đen, vàng',
        brand: 'Genshin Cosplay',
        categoryId: categories[2].id, // Game
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay League of Legends - Ahri',
        description:
          'Trang phục Ahri với đuôi và phụ kiện, size S-M-L. Chất liệu cao cấp.',
        price: 500000,
        deposit: 250000,
        quantity: 1,
        size: 'S, M, L',
        color: 'Xanh, trắng',
        brand: 'LoL Cosplay',
        categoryId: categories[2].id, // Game
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay K-Pop - BTS Dynamite Outfit',
        description:
          'Trang phục BTS Dynamite, phong cách retro, size M-L-XL.',
        price: 280000,
        deposit: 120000,
        quantity: 4,
        size: 'M, L, XL',
        color: 'Nhiều màu',
        brand: 'K-Pop Cosplay',
        categoryId: categories[3].id, // K-Pop
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Marvel - Spider-Man Suit',
        description:
          'Đồ Spider-Man với chất liệu spandex, size M-L-XL. Có thể tùy chỉnh.',
        price: 400000,
        deposit: 200000,
        quantity: 3,
        size: 'M, L, XL',
        color: 'Đỏ, xanh',
        brand: 'Marvel Cosplay',
        categoryId: categories[4].id, // Western
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Harry Potter - Robe Gryffindor',
        description:
          'Áo choàng Gryffindor chính hãng, kèm cà vạt và phù hiệu, size S-M-L-XL.',
        price: 350000,
        deposit: 150000,
        quantity: 5,
        size: 'S, M, L, XL',
        color: 'Đỏ, vàng',
        brand: 'HP Cosplay',
        categoryId: categories[4].id, // Western
        isAvailable: true,
        isActive: true,
      },
    ];

    const createdProducts = await Promise.all(
      products.map((productData) => {
        const product = this.productsRepository.create(productData);
        return this.productsRepository.save(product);
      }),
    );

    return createdProducts;
  }

  private async seedProductImages(products: Product[]): Promise<void> {
    // TODO: Thay đổi các URLs này thành ảnh thực tế của bạn
    // Cách 1: Đặt ảnh trong public folder của frontend
    // Cách 2: Upload lên Cloudinary và lấy URL
    // Cách 3: Sử dụng Google Drive public links (xem hướng dẫn bên dưới)

    const imageUrls = [
      // Anime
      '/img_clothes/anime/Akatsuki truyện naruto (4).jpg',
      '/img_clothes/anime/Akatsuki truyện naruto (5).jpg',
      '/img_clothes/anime/Boa Hancok One Piece (4)-min.jpg',
      '/img_clothes/anime/Boa Hancok One Piece (6)-min (1).jpg',
      '/img_clothes/anime/robot AI bó sát (2)-min.jpg',
      '/img_clothes/anime/robot AI bó sát (3)-min.jpg',
      '/img_clothes/anime/robot ai nam (1)-min.jpg',
      '/img_clothes/anime/robot ai nam (2)-min.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-1.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-5.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-7.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-9.jpg',
      '/img_clothes/anime/Zoro One piece (1).jpg',
      '/img_clothes/anime/Zoro One piece (2).jpg',
      '/img_clothes/anime/cosplay D.VA game Overwatch (2)-min.jpg',
      '/img_clothes/anime/cosplay D.VA game Overwatch (5)-min.jpg',
      '/img_clothes/anime/songoku-min.jpg',
      '/img_clothes/anime/succubus khách hàng jun vũ (1)-min.jpg',
      '/img_clothes/anime/hầu gái nam maid đen trắng (2).jpg',
      '/img_clothes/anime/hầu gái nam maid đen trắng (4).jpg',
      '/img_clothes/anime/hầu gái ngắn màu đen trắng (1).jpg',
      '/img_clothes/anime/hầu gái ngắn màu đen trắng (2).jpg',
      '/img_clothes/anime/loat-hinh-anh-cosplay-anime-sieu-dinh-cua-coser-xinh-dep-senyamiku3.jpg',
      '/img_clothes/anime/loat-hinh-anh-cosplay-anime-sieu-dinh-cua-coser-xinh-dep-senyamiku5.jpg',
      '/img_clothes/anime/1.png',
      '/img_clothes/anime/2.png',
      
      // Cổ Tích
      '/img_clothes/coTich/000aa6833cdc1c0415c4b11a8495510d.jpg',
      '/img_clothes/coTich/4931f28604c685d4f18be7cae63cd165.jpg',
      '/img_clothes/coTich/4b90eb3353f027ae99ecb21e66fc14d3.jpg',
      '/img_clothes/coTich/8883de06ff0dbc5ee10d9310c9ff51cd.jpg',
      '/img_clothes/coTich/92ffb19f91216e9b0efe8f276e159bac.jpg',
      '/img_clothes/coTich/c46d5df0999df54df2c6a65223c6eaa5.jpg',
      '/img_clothes/coTich/ebb8a7134d0baea1c900bb769ae1ab74.jpg',
      
      // Cổ Trang
      '/img_clothes/coTrang/2f15ae551b1a2273725028f64955a607.jpg',
      '/img_clothes/coTrang/6243269c80ef4ead4e27a2b1bb317154.jpg',
      '/img_clothes/coTrang/ad2968417d9ba21effc2bcf68ee9f506.jpg',
      '/img_clothes/coTrang/b406f5ecbdd65e0804b008ed7f3aef73.jpg',
      '/img_clothes/coTrang/chup-anh-co-trang__19__a149e2bce3964e148f53715104946b15.jpg',
      '/img_clothes/coTrang/chup-anh-co-trang__44__b7b8b9e19a6347cb952f190c79d9ef1b.jpg',
      '/img_clothes/coTrang/phu-kien-co-trang-dep-va-hot-trend.jpg',
      
      // Đồng Phục Học Sinh
      '/img_clothes/dongPhucHocSinh/0430f42f54c83df341e3bc667e210891.jpg',
      '/img_clothes/dongPhucHocSinh/15f1421c07a7dfcc46702acc057f2bbf.jpg',
      '/img_clothes/dongPhucHocSinh/4fea79e7ec0237753af7ca76f4504c27.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nam sinh hàn quốc (1)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nam sinh hàn quốc (2)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nhật màu xanh navy (2).jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nhật màu xanh navy.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh hàn quốc (1)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh hàn quốc (3)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh nhật bản dài tay (1).jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh nhật bản dài tay (2).jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh nhật yun cosplay (12).jpg',
      '/img_clothes/dongPhucHocSinh/đồng phục nữ sinh nhật yun cosplay (23).jpg',
      '/img_clothes/dongPhucHocSinh/gakuran đồng phục nam sinh nhật bản (12)-min.jpg',
      '/img_clothes/dongPhucHocSinh/gakuran đồng phục nam sinh nhật bản (13)-min.jpg',
    ];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      // Mỗi product có 3 ảnh
      const startIndex = (i * 3) % imageUrls.length;
      const productImages = [
        imageUrls[startIndex % imageUrls.length],
        imageUrls[(startIndex + 1) % imageUrls.length],
        imageUrls[(startIndex + 2) % imageUrls.length],
      ];

      const images = productImages.map((url, index) => ({
        url,
        publicId: `cosplay/products/${product.id}/${index}`,
        alt: `${product.name} - Ảnh ${index + 1}`,
        order: index,
        productId: product.id,
        isActive: true,
      }));

      await Promise.all(
        images.map((imageData) => {
          const image = this.productImagesRepository.create(imageData);
          return this.productImagesRepository.save(image);
        }),
      );
    }
  }

  private async seedAddresses(users: User[]): Promise<void> {
    const user = users.find((u) => u.role === UserRole.USER);
    if (!user) return;

    const addresses = [
      {
        fullName: user.fullName,
        phone: user.phone,
        address: '123 Đường ABC',
        ward: 'Phường 1',
        district: 'Quận 1',
        province: 'TP. Hồ Chí Minh',
        postalCode: '700000',
        isDefault: true,
        userId: user.id,
        isActive: true,
      },
      {
        fullName: user.fullName,
        phone: user.phone,
        address: '456 Đường XYZ',
        ward: 'Phường 2',
        district: 'Quận 3',
        province: 'TP. Hồ Chí Minh',
        postalCode: '700000',
        isDefault: false,
        userId: user.id,
        isActive: true,
      },
    ];

    await Promise.all(
      addresses.map((addressData) => {
        const address = this.addressesRepository.create(addressData);
        return this.addressesRepository.save(address);
      }),
    );
  }

  private async seedFavorites(
    users: User[],
    products: Product[],
  ): Promise<Favorite[]> {
    const regularUsers = users.filter((u) => u.role === UserRole.USER);
    const favorites: Favorite[] = [];

    // User 1 thích một số sản phẩm
    if (regularUsers[0] && products.length >= 3) {
      for (let i = 0; i < 3; i++) {
        favorites.push(
          this.favoritesRepository.create({
            userId: regularUsers[0].id,
            productId: products[i].id,
          }),
        );
      }
    }

    // User 2 thích một số sản phẩm khác
    if (regularUsers[1] && products.length >= 5) {
      for (let i = 2; i < 5; i++) {
        favorites.push(
          this.favoritesRepository.create({
            userId: regularUsers[1].id,
            productId: products[i].id,
          }),
        );
      }
    }

    const savedFavorites = await Promise.all(
      favorites.map((favorite) => this.favoritesRepository.save(favorite)),
    );

    return savedFavorites;
  }

  private async seedOrders(
    users: User[],
    products: Product[],
  ): Promise<Order[]> {
    const regularUsers = users.filter((u) => u.role === UserRole.USER);
    const orders: Order[] = [];

    // Tạo 3 đơn hàng cho user1
    if (regularUsers[0] && products.length >= 3) {
      // Order 1: CONFIRMED (đã xác nhận)
      const order1 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-001`,
        userId: regularUsers[0].id,
        status: OrderStatus.CONFIRMED,
        totalPrice: products[0].price * 1 + products[1].price * 1,
        totalDeposit: (products[0].deposit || 0) * 1 + (products[1].deposit || 0) * 1,
        rentalStartDate: new Date('2024-01-15'),
        rentalEndDate: new Date('2024-01-20'),
        rentalAddress: '123 Đường ABC, Phường 1, Quận 1, TP. Hồ Chí Minh',
        notes: 'Giao hàng vào buổi sáng',
      });
      const savedOrder1 = await this.ordersRepository.save(order1);

      // Order Items cho Order 1
      await this.orderItemsRepository.save([
        this.orderItemsRepository.create({
          orderId: savedOrder1.id,
          productId: products[0].id,
          quantity: 1,
          price: products[0].price,
          deposit: products[0].deposit || 0,
        }),
        this.orderItemsRepository.create({
          orderId: savedOrder1.id,
          productId: products[1].id,
          quantity: 1,
          price: products[1].price,
          deposit: products[1].deposit || 0,
        }),
      ]);
      orders.push(savedOrder1);

      // Order 2: RENTED (đang thuê)
      const order2 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-002`,
        userId: regularUsers[0].id,
        status: OrderStatus.RENTED,
        totalPrice: products[2].price * 2,
        totalDeposit: (products[2].deposit || 0) * 2,
        rentalStartDate: new Date('2024-01-10'),
        rentalEndDate: new Date('2024-01-17'),
        rentalAddress: '123 Đường ABC, Phường 1, Quận 1, TP. Hồ Chí Minh',
        notes: 'Cần giao sớm',
      });
      const savedOrder2 = await this.ordersRepository.save(order2);

      await this.orderItemsRepository.save(
        this.orderItemsRepository.create({
          orderId: savedOrder2.id,
          productId: products[2].id,
          quantity: 2,
          price: products[2].price,
          deposit: products[2].deposit || 0,
        }),
      );
      orders.push(savedOrder2);

      // Order 3: RETURNED (đã trả)
      const order3 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-003`,
        userId: regularUsers[0].id,
        status: OrderStatus.RETURNED,
        totalPrice: products[3].price * 1,
        totalDeposit: (products[3].deposit || 0) * 1,
        rentalStartDate: new Date('2024-01-01'),
        rentalEndDate: new Date('2024-01-08'),
        rentalAddress: '123 Đường ABC, Phường 1, Quận 1, TP. Hồ Chí Minh',
        notes: 'Đã hoàn trả',
      });
      const savedOrder3 = await this.ordersRepository.save(order3);

      await this.orderItemsRepository.save(
        this.orderItemsRepository.create({
          orderId: savedOrder3.id,
          productId: products[3].id,
          quantity: 1,
          price: products[3].price,
          deposit: products[3].deposit || 0,
        }),
      );
      orders.push(savedOrder3);
    }

    // Tạo 2 đơn hàng cho user2
    if (regularUsers[1] && products.length >= 5) {
      // Order 4: CONFIRMED
      const order4 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-004`,
        userId: regularUsers[1].id,
        status: OrderStatus.CONFIRMED,
        totalPrice: products[4].price * 1,
        totalDeposit: (products[4].deposit || 0) * 1,
        rentalStartDate: new Date('2024-01-20'),
        rentalEndDate: new Date('2024-01-25'),
        rentalAddress: '456 Đường XYZ, Phường 2, Quận 3, TP. Hồ Chí Minh',
        notes: 'Giao hàng vào buổi chiều',
      });
      const savedOrder4 = await this.ordersRepository.save(order4);

      await this.orderItemsRepository.save(
        this.orderItemsRepository.create({
          orderId: savedOrder4.id,
          productId: products[4].id,
          quantity: 1,
          price: products[4].price,
          deposit: products[4].deposit || 0,
        }),
      );
      orders.push(savedOrder4);

      // Order 5: RENTED
      const order5 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-005`,
        userId: regularUsers[1].id,
        status: OrderStatus.RENTED,
        totalPrice: products[5].price * 1 + products[6].price * 1,
        totalDeposit: (products[5].deposit || 0) * 1 + (products[6].deposit || 0) * 1,
        rentalStartDate: new Date('2024-01-12'),
        rentalEndDate: new Date('2024-01-19'),
        rentalAddress: '456 Đường XYZ, Phường 2, Quận 3, TP. Hồ Chí Minh',
        notes: 'Cần cẩn thận khi giao hàng',
      });
      const savedOrder5 = await this.ordersRepository.save(order5);

      await this.orderItemsRepository.save([
        this.orderItemsRepository.create({
          orderId: savedOrder5.id,
          productId: products[5].id,
          quantity: 1,
          price: products[5].price,
          deposit: products[5].deposit || 0,
        }),
        this.orderItemsRepository.create({
          orderId: savedOrder5.id,
          productId: products[6].id,
          quantity: 1,
          price: products[6].price,
          deposit: products[6].deposit || 0,
        }),
      ]);
      orders.push(savedOrder5);
    }

    return orders;
  }

  private async seedPayments(orders: Order[]): Promise<Payment[]> {
    const payments: Payment[] = [];

    for (const order of orders) {
      // Chỉ tạo payment cho các order đã được xác nhận hoặc đang thuê hoặc đã trả
      if (
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.RENTED ||
        order.status === OrderStatus.RETURNED
      ) {
        const paymentStatus =
          order.status === OrderStatus.RETURNED
            ? PaymentStatus.COMPLETED
            : order.status === OrderStatus.RENTED
              ? PaymentStatus.COMPLETED
              : PaymentStatus.COMPLETED;

        const payment = this.paymentsRepository.create({
          orderId: order.id,
          method: PaymentMethod.SEPAY,
          status: paymentStatus,
          amount: order.totalPrice + (order.totalDeposit || 0),
          transactionId: `TXN-${Date.now()}-${order.orderNumber}`,
        });

        payments.push(await this.paymentsRepository.save(payment));
      }
    }

    return payments;
  }

  private async seedComments(
    users: User[],
    orders: Order[],
  ): Promise<Comment[]> {
    const comments: Comment[] = [];

    // Chỉ comment cho các order đã được xác nhận, đang thuê hoặc đã trả
    const commentableOrders = orders.filter(
      (order) =>
        order.status === OrderStatus.CONFIRMED ||
        order.status === OrderStatus.RENTED ||
        order.status === OrderStatus.RETURNED,
    );

    const ratings = [5, 4, 5, 4, 5, 3, 4, 5]; // Đánh giá mẫu
    const contents = [
      'Sản phẩm rất đẹp, chất lượng tốt!',
      'Giao hàng nhanh, sản phẩm như mô tả.',
      'Rất hài lòng với dịch vụ, sẽ quay lại!',
      'Trang phục đẹp, size vừa vặn!',
      'Chất liệu tốt, may mặc chắc chắn.',
      'Giá hợp lý, sẽ giới thiệu bạn bè.',
      'Đóng gói cẩn thận, shop nhiệt tình.',
      'Cosplay xong rất đẹp, mọi người khen nhiều!',
    ];

    // Lấy order items để biết product nào trong order
    for (const order of commentableOrders) {
      const orderItems = await this.orderItemsRepository.find({
        where: { orderId: order.id },
      });

      // Comment cho TẤT CẢ products trong order
      for (const item of orderItems) {
        const comment = this.commentsRepository.create({
          userId: order.userId,
          productId: item.productId,
          orderId: order.id,
          content: contents[comments.length % contents.length],
          rating: ratings[comments.length % ratings.length],
          isActive: true,
        });

        comments.push(await this.commentsRepository.save(comment));
      }
    }

    return comments;
  }

  async debugProducts() {
    const allProducts = await this.productsRepository.find({
      relations: ['category', 'productImages'],
      order: { createdAt: 'DESC' },
    });

    return {
      total: allProducts.length,
      active: allProducts.filter(p => p.isActive).length,
      inactive: allProducts.filter(p => !p.isActive).length,
      products: allProducts.map(p => ({
        id: p.id,
        name: p.name,
        isActive: p.isActive,
        isAvailable: p.isAvailable,
        category: p.category?.name || 'N/A',
        imagesCount: p.productImages?.length || 0,
        createdAt: p.createdAt,
      })),
    };
  }

  private async seedVouchers(): Promise<Voucher[]> {
    const now = new Date();

    const vouchers = [
      {
        code: 'WELCOME10',
        description: 'Giảm 10% cho đơn hàng đầu tiên',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 10,
        maxDiscount: 50000,
        minOrderValue: 200000,
        startDate: now,
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
      },
      {
        code: 'NEWYEAR2025',
        description: 'Giảm 20% chào mừng năm mới 2025',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 20,
        maxDiscount: 100000,
        minOrderValue: 500000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        usageLimit: 50,
        usedCount: 12,
        isActive: true,
      },
      {
        code: 'FREESHIP',
        description: 'Miễn phí ship 30k',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 30000,
        minOrderValue: 300000,
        startDate: now,
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days
        usageLimit: 0, // Unlimited
        usedCount: 23,
        isActive: true,
      },
      {
        code: 'COSPLAY50K',
        description: 'Giảm 50k cho đơn từ 1 triệu',
        discountType: VoucherDiscountType.FIXED,
        discountValue: 50000,
        minOrderValue: 1000000,
        startDate: now,
        endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days
        usageLimit: 20,
        usedCount: 8,
        isActive: true,
      },
      {
        code: 'FLASHSALE',
        description: 'Flash sale giảm 25%',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 25,
        maxDiscount: 150000,
        minOrderValue: 800000,
        startDate: now,
        endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        usageLimit: 30,
        usedCount: 18,
        isActive: true,
      },
      {
        code: 'OLDCODE',
        description: 'Mã cũ đã hết hạn',
        discountType: VoucherDiscountType.PERCENT,
        discountValue: 15,
        maxDiscount: 75000,
        minOrderValue: 400000,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-31'), // Expired
        usageLimit: 50,
        usedCount: 45,
        isActive: false,
      },
    ];

    const createdVouchers = await Promise.all(
      vouchers.map((voucherData) => {
        const voucher = this.vouchersRepository.create(voucherData);
        return this.vouchersRepository.save(voucher);
      }),
    );

    return createdVouchers;
  }
}
