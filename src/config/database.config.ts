import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not defined. Please check your .env file.',
    );
  }

  // Parse database URL để kiểm tra SSL
  const isNeon = databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require');
  
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl: isNeon
      ? {
          rejectUnauthorized: false,
        }
      : false,
    retryAttempts: 5,
    retryDelay: 3000,
  };
};

