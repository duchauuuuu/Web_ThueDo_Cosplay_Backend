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
        name: 'Đồng phục',
        description: 'Trang phục đồng phục các loại: học sinh, công sở, y tế,...',
        image: '/img_clothes/dongPhucHocSinh/1.jpg',
        isActive: true,
      },
      {
        name: 'Harry Potter',
        description: 'Trang phục cosplay các nhân vật trong Harry Potter',
        image: '/img_clothes/coTich/000aa6833cdc1c0415c4b11a8495510d.jpg',
        isActive: true,
      },
      {
        name: 'Halloween',
        description: 'Trang phục Halloween kinh dị, ma quái',
        image: '/img_clothes/anime/robot AI bó sát (2)-min.jpg',
        isActive: true,
      },
      {
        name: 'Cổ tích',
        description: 'Trang phục các nhân vật cổ tích: công chúa, hoàng tử,...',
        image: '/img_clothes/coTich/4931f28604c685d4f18be7cae63cd165.jpg',
        isActive: true,
      },
      {
        name: 'Siêu nhân',
        description: 'Trang phục siêu anh hùng Marvel, DC Comics',
        image: '/img_clothes/coTrang/2f15ae551b1a2273725028f64955a607.jpg',
        isActive: true,
      },
      {
        name: 'Cổ trang',
        description: 'Trang phục cổ trang Trung Hoa, Việt Nam, Nhật Bản',
        image: '/img_clothes/coTrang/6243269c80ef4ead4e27a2b1bb317154.jpg',
        isActive: true,
      },
      {
        name: 'Các nước',
        description: 'Trang phục truyền thống các quốc gia trên thế giới',
        image: '/img_clothes/anime/Boa Hancok One Piece (4)-min.jpg',
        isActive: true,
      },
      {
        name: 'Cổ Tích Disney',
        description: 'Trang phục công chúa và nhân vật Disney',
        image: '/img_clothes/coTich/4931f28604c685d4f18be7cae63cd165.jpg',
        isActive: true,
      },
      {
        name: 'Steampunk',
        description: 'Phong cách Steampunk cổ điển',
        image: '/img_clothes/anime/robot AI bó sát (3)-min.jpg',
        isActive: true,
      },
      {
        name: 'Horror',
        description: 'Trang phục kinh dị và Halloween',
        image: '/img_clothes/anime/Akatsuki truyền naruto (5).jpg',
        isActive: true,
      },
      {
        name: 'Vocaloid',
        description: 'Trang phục Vocaloid và Hatsune Miku',
        image: '/img_clothes/dongPhucHocSinh/1.jpg',
        isActive: true,
      },
      {
        name: 'J-Pop Idol',
        description: 'Trang phục J-Pop idol Nhật Bản',
        image: '/img_clothes/coTich/000aa6833cdc1c0415c4b11a8495510d.jpg',
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
      // ANIME - 3 sản phẩm
      {
        name: 'Cosplay Naruto - Áo khoác Akatsuki',
        description: 'Áo khoác Akatsuki chính hãng, chất liệu cao cấp, size M-L-XL. Phù hợp cho cosplay Naruto.',
        price: 250000,
        discountPrice: 220000,
        quantity: 100,
        size: 'M, L, XL',
        color: 'Đỏ đen',
        brand: 'Cosplay Pro',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay Demon Slayer - Kimono Tanjiro',
        description: 'Kimono Tanjiro Kamado với họa tiết đặc trưng, chất liệu vải mềm mại.',
        price: 300000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Xanh lá, đen',
        brand: 'Anime Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cosplay One Piece - Luffy Gear 5',
        description: 'Trang phục Luffy Gear 5 với áo khoác và quần, kèm mũ rơm.',
        price: 350000,
        discountPrice: 270000,
        quantity: 100,
        size: 'M, L, XL',
        color: 'Đỏ, vàng',
        brand: 'Pirate Cosplay',
        categoryId: categories[0].id, // Anime
        isAvailable: true,
        isActive: true,
      },

      // ĐỒNG PHỤC - 2 sản phẩm
      {
        name: 'Đồng phục học sinh Nhật Bản - Sailor',
        description: 'Đồng phục học sinh Nhật kiểu sailor, chất liệu cotton cao cấp.',
        price: 200000,
        discountPrice: 170000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Xanh navy, trắng',
        brand: 'School Uniform',
        categoryId: categories[1].id, // Đồng phục
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Đồng phục học sinh Hàn Quốc',
        description: 'Đồng phục học sinh Hàn Quốc với áo vest và váy xếp ly.',
        price: 220000,
        discountPrice: 190000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Xám, trắng',
        brand: 'K-School',
        categoryId: categories[1].id, // Đồng phục
        isAvailable: true,
        isActive: true,
      },

      // HARRY POTTER - 3 sản phẩm
      {
        name: 'Harry Potter - Áo choàng Gryffindor',
        description: 'Áo choàng Gryffindor chính hãng với cà vạt và phù hiệu.',
        price: 350000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L, XL',
        color: 'Đỏ, vàng',
        brand: 'HP Cosplay',
        categoryId: categories[2].id, // Harry Potter
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Harry Potter - Áo choàng Slytherin',
        description: 'Áo choàng Slytherin với cà vạt xanh bạc và phù hiệu rắn.',
        price: 350000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L, XL',
        color: 'Xanh lá, bạc',
        brand: 'HP Cosplay',
        categoryId: categories[2].id, // Harry Potter
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Harry Potter - Áo choàng Hufflepuff',
        description: 'Áo choàng Hufflepuff với cà vạt vàng đen và phù hiệu.',
        price: 350000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L, XL',
        color: 'Vàng, đen',
        brand: 'HP Cosplay',
        categoryId: categories[2].id, // Harry Potter
        isAvailable: true,
        isActive: true,
      },

      // HALLOWEEN - 2 sản phẩm
      {
        name: 'Halloween - Trang phục ma cà rồng',
        description: 'Trang phục ma cà rồng với áo choàng và răng nanh giả.',
        price: 180000,
        discountPrice: 170000,
        quantity: 100,
        size: 'M, L, XL',
        color: 'Đen, đỏ',
        brand: 'Halloween Store',
        categoryId: categories[3].id, // Halloween
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Halloween - Trang phục phù thủy',
        description: 'Trang phục phù thủy với mũ nhọn và áo choàng dài.',
        price: 160000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Đen, tím',
        brand: 'Halloween Store',
        categoryId: categories[3].id, // Halloween
        isAvailable: true,
        isActive: true,
      },

      // CỔ TÍCH - 3 sản phẩm
      {
        name: 'Cổ tích - Váy công chúa Elsa',
        description: 'Váy công chúa Elsa Frozen với voan lấp lánh và phụ kiện.',
        price: 400000,
        discountPrice: 350000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Xanh da trời',
        brand: 'Disney Cosplay',
        categoryId: categories[4].id, // Cổ tích
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cổ tích - Váy công chúa Belle',
        description: 'Váy công chúa Belle với váy vàng sang trọng.',
        price: 380000,
        discountPrice: 340000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Vàng',
        brand: 'Disney Cosplay',
        categoryId: categories[4].id, // Cổ tích
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cổ tích - Trang phục Nàng tiên cá Ariel',
        description: 'Trang phục nàng tiên cá Ariel với đuôi cá và áo vỏ sò.',
        price: 420000,
        discountPrice: 380000,
        quantity: 100,
        size: 'S, M',
        color: 'Xanh lá, tím',
        brand: 'Disney Cosplay',
        categoryId: categories[4].id, // Cổ tích
        isAvailable: true,
        isActive: true,
      },

      // SIÊU NHÂN - 3 sản phẩm
      {
        name: 'Siêu nhân - Spider-Man Classic',
        description: 'Đồ Spider-Man classic với chất liệu spandex co giãn tốt.',
        price: 400000,
        discountPrice: 350000,
        quantity: 100,
        size: 'M, L, XL',
        color: 'Đỏ, xanh',
        brand: 'Marvel Cosplay',
        categoryId: categories[5].id, // Siêu nhân
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Siêu nhân - Iron Man Mark 50',
        description: 'Trang phục Iron Man với áo giáp chi tiết, đèn LED.',
        price: 600000,
        discountPrice: 540000,
        quantity: 100,
        size: 'M, L, XL',
        color: 'Đỏ, vàng',
        brand: 'Marvel Cosplay',
        categoryId: categories[5].id, // Siêu nhân
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Siêu nhân - Wonder Woman',
        description: 'Trang phục Wonder Woman với áo giáp, váy và vương miện.',
        price: 450000,
        discountPrice: 380000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Đỏ, xanh, vàng',
        brand: 'DC Cosplay',
        categoryId: categories[5].id, // Siêu nhân
        isAvailable: true,
        isActive: true,
      },

      // CỔ TRANG - 3 sản phẩm
      {
        name: 'Cổ trang - Hán phục Trung Quốc',
        description: 'Hán phục Trung Quốc với áo dài và váy xếp ly sang trọng.',
        price: 320000,
        discountPrice: 280000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Đỏ, vàng',
        brand: 'Hanfu Store',
        categoryId: categories[6].id, // Cổ trang
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cổ trang - Kimono Nhật Bản',
        description: 'Kimono Nhật Bản truyền thống với họa tiết hoa anh đào.',
        price: 300000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Hồng, trắng',
        brand: 'Kimono Shop',
        categoryId: categories[6].id, // Cổ trang
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Cổ trang - Áo dài Việt Nam',
        description: 'Áo dài Việt Nam với chất liệu lụa cao cấp.',
        price: 280000,
        discountPrice: 250000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Trắng, đỏ',
        brand: 'Áo Dài Việt',
        categoryId: categories[6].id, // Cổ trang
        isAvailable: true,
        isActive: true,
      },

      // CÁC NƯỚC - 3 sản phẩm
      {
        name: 'Các nước - Hanbok Hàn Quốc',
        description: 'Hanbok Hàn Quốc truyền thống với áo jeogori và váy chima.',
        price: 350000,
        discountPrice: 270000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Hồng, xanh',
        brand: 'Hanbok Korea',
        categoryId: categories[7].id, // Các nước
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Các nước - Sari Ấn Độ',
        description: 'Sari Ấn Độ với vải lụa óng ả và trang sức đi kèm.',
        price: 320000,
        discountPrice: 280000,
        quantity: 100,
        size: 'Free size',
        color: 'Vàng, đỏ, xanh',
        brand: 'India Traditional',
        categoryId: categories[7].id, // Các nước
        isAvailable: true,
        isActive: true,
      },
      {
        name: 'Các nước - Yukata Nhật Bản',
        description: 'Yukata Nhật Bản mùa hè với họa tiết hoa đẹp mắt.',
        price: 260000,
        quantity: 100,
        size: 'S, M, L',
        color: 'Xanh, hồng',
        brand: 'Japan Traditional',
        categoryId: categories[7].id, // Các nước
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
      // Anime - tất cả ảnh không có khoảng trắng
      '/img_clothes/anime/Shenhe-Cosplay-1.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-5.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-7.jpg',
      '/img_clothes/anime/Shenhe-Cosplay-9.jpg',
      '/img_clothes/anime/songoku-min.jpg',
      '/img_clothes/anime/loat-hinh-anh-cosplay-anime-sieu-dinh-cua-coser-xinh-dep-senyamiku3.jpg',
      '/img_clothes/anime/loat-hinh-anh-cosplay-anime-sieu-dinh-cua-coser-xinh-dep-senyamiku5.jpg',
      '/img_clothes/anime/1.png',
      '/img_clothes/anime/2.png',
      '/img_clothes/anime/37854368327e17567928ca168adb7f11.jpg',
      '/img_clothes/anime/8178677ac6e0e8a063e8a0468af6636d.jpg',
      '/img_clothes/anime/-158012232494169592560.webp',
      '/img_clothes/anime/ZoroOnepiece(1).jpg',
      '/img_clothes/anime/Akatsukitruyệnnaruto(4).jpg',
      '/img_clothes/anime/Akatsukitruyệnnaruto(5).jpg',
      '/img_clothes/anime/BoaHancokOnePiece(4)-min.jpg',
      '/img_clothes/anime/robotAIbósát(2)-min.jpg',
      '/img_clothes/anime/robotAIbósát(3)-min.jpg',
      '/img_clothes/anime/robotainam(1)-min.jpg',
      '/img_clothes/anime/robotainam(2)-min.jpg',
      '/img_clothes/anime/succubuskháchhàngjunvũ(1)-min.jpg',
      '/img_clothes/anime/hầugáinammaidđentrắng(2).jpg',
      '/img_clothes/anime/hầugáinammaidđentrắng(4).jpg',
      '/img_clothes/anime/hầugáingắnmàuđentrắng(1).jpg',
      '/img_clothes/anime/hầugáingắnmàuđentrắng(2).jpg',
      
      // Cổ Tích - tất cả đều OK (hash names)
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
      '/img_clothes/coTrang/9ef94d30a0a48e6c254b50f134699a42.jpg',
      '/img_clothes/coTrang/ad2968417d9ba21effc2bcf68ee9f506.jpg',
      '/img_clothes/coTrang/b406f5ecbdd65e0804b008ed7f3aef73.jpg',
      '/img_clothes/coTrang/chup-anh-co-trang__19__a149e2bce3964e148f53715104946b15.jpg',
      '/img_clothes/coTrang/chup-anh-co-trang__44__b7b8b9e19a6347cb952f190c79d9ef1b.jpg',
      '/img_clothes/coTrang/phu-kien-co-trang-dep-va-hot-trend.jpg',
      
      // Đồng Phục Học Sinh - tất cả ảnh không có khoảng trắng
      '/img_clothes/dongPhucHocSinh/0430f42f54c83df341e3bc667e210891.jpg',
      '/img_clothes/dongPhucHocSinh/15f1421c07a7dfcc46702acc057f2bbf.jpg',
      '/img_clothes/dongPhucHocSinh/4fea79e7ec0237753af7ca76f4504c27.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnamsinhhànquốc(1)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnamsinhhànquốc(2)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnhậtmàuxanhnavy(2).jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnhậtmàuxanhnavy.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhhànquốc(1)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhhànquốc(3)-min.jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhnhậtbảndàitay(1).jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhnhậtbảndàitay(2).jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhnhậtyuncosplay(12).jpg',
      '/img_clothes/dongPhucHocSinh/đồngphụcnữsinhnhậtyuncosplay(23).jpg',
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
        totalDeposit: 0,
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
          deposit: 0,
        }),
        this.orderItemsRepository.create({
          orderId: savedOrder1.id,
          productId: products[1].id,
          quantity: 1,
          price: products[1].price,
          deposit: 0,
        }),
      ]);
      orders.push(savedOrder1);

      // Order 2: RENTED (đang thuê)
      const order2 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-002`,
        userId: regularUsers[0].id,
        status: OrderStatus.RENTED,
        totalPrice: products[2].price * 2,
        totalDeposit: 0,
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
          deposit: 0,
        }),
      );
      orders.push(savedOrder2);

      // Order 3: RETURNED (đã trả)
      const order3 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-003`,
        userId: regularUsers[0].id,
        status: OrderStatus.RETURNED,
        totalPrice: products[3].price * 1,
        totalDeposit: 0,
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
          deposit: 0,
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
        totalDeposit: 0,
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
          deposit: 0,
        }),
      );
      orders.push(savedOrder4);

      // Order 5: RENTED
      const order5 = this.ordersRepository.create({
        orderNumber: `ORD-${Date.now()}-005`,
        userId: regularUsers[1].id,
        status: OrderStatus.RENTED,
        totalPrice: products[5].price * 1 + products[6].price * 1,
        totalDeposit: 0,
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
          deposit: 0,
        }),
        this.orderItemsRepository.create({
          orderId: savedOrder5.id,
          productId: products[6].id,
          quantity: 1,
          price: products[6].price,
          deposit: 0,
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
