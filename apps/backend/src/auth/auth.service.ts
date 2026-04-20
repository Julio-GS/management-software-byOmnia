import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserEntity } from '../users/entities/user.entity';
import { PinoLogger } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

// AuthResponse uses UserEntity which has role as string for backend flexibility
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserEntity;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    logger.setContext(AuthService.name);
  }

  async validateUser(username: string, password: string): Promise<any> {
    this.logger.debug({ username }, 'Attempting to validate user');

    const user = await this.usersService.findByUsernameWithPassword(username);

    if (!user) {
      this.logger.warn({ username }, 'User not found during validation');
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.warn({ username, userId: user.id }, 'Inactive user attempted login');
      throw new UnauthorizedException('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn({ username, userId: user.id }, 'Invalid password attempt');
      return null;
    }

    this.logger.info({ username, userId: user.id }, 'User validated successfully');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      this.logger.warn({ username: loginDto.username }, 'Login failed: Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.info({ userId: user.id, username: user.username }, 'User logged in successfully');

    return {
      ...tokens,
      user: new UserEntity(user),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Create user
    const user = await this.usersService.create(registerDto);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      this.logger.debug({ userId: payload.sub }, 'Refresh token validated');

      // Verify user still exists and is active
      const user = await this.usersService.findOne(payload.sub);

      if (!user || !user.isActive) {
        this.logger.warn({ userId: payload.sub }, 'Refresh token rejected: User inactive or not found');
        throw new UnauthorizedException('User is inactive or does not exist');
      }

      // Generate new access token
      const access_token = await this.jwtService.signAsync(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        },
      );

      this.logger.info({ userId: user.id }, 'Access token refreshed successfully');

      return { access_token };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Refresh token validation failed');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(user: any): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return {
      access_token,
      refresh_token,
    };
  }
}
