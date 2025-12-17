import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    
    // Generate access token (30 minutes)
    const accessTokenExpires = (this.configService.get<string>('JWT_EXPIRES_IN') || '30m') as StringValue;
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpires,
    });

    // Generate refresh token (30 days)
    const refreshTokenExpires = (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d') as StringValue;
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshTokenExpires,
    });

    // Calculate expiresAt based on JWT_REFRESH_EXPIRES_IN
    const expiresAt = new Date();
    const refreshExpiresStr = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    
    // Parse days from format like '30d', '7d', '1d'
    const daysMatch = refreshExpiresStr.match(/(\d+)d/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      expiresAt.setDate(expiresAt.getDate() + days);
    } else {
      // Fallback to 30 days if format is not recognized
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    await this.refreshTokenRepository.save({
      token: refreshToken,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Check if refresh token exists and is valid
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, userId: payload.sub },
      });

      if (!storedToken || storedToken.isRevoked) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      if (new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }

      // Generate new access token
      const newPayload = {
        email: payload.email,
        sub: payload.sub,
        role: payload.role,
      };

      const accessTokenExpires = (this.configService.get<string>('JWT_EXPIRES_IN') || '30m') as StringValue;
      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: accessTokenExpires,
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async revokeRefreshToken(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }
}

