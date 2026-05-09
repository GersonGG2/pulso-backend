import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { Request } from 'express';
import { User } from '@prisma/client';
import { UsersRepository } from '../../users/users.repository';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface AuthRequest extends Request {
  user?: User;
}

/**
 * Global guard that protects every endpoint by default.
 *
 * Production: verifies a Clerk-issued JWT in the `Authorization: Bearer <token>` header.
 * Development: falls back to `x-user-id` header for easy curl/Swagger testing
 *              (only when NODE_ENV !== 'production').
 *
 * Endpoints decorated with @Public() bypass this guard entirely.
 */
@Injectable()
export class ClerkGuard implements CanActivate {
  private readonly logger = new Logger(ClerkGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const isProduction = this.config.get('NODE_ENV') === 'production';

    // Dev fallback: x-user-id header
    if (!isProduction) {
      const devUserId = request.headers['x-user-id'];
      if (typeof devUserId === 'string' && devUserId.length > 0) {
        const user = await this.users.findById(devUserId);
        if (!user) {
          throw new UnauthorizedException(`Dev mode: user ${devUserId} not found`);
        }
        request.user = user;
        return true;
      }
    }

    // Production / no dev header: verify Clerk JWT
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const secretKey = this.config.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      this.logger.error('CLERK_SECRET_KEY not configured — cannot verify JWT');
      throw new UnauthorizedException('Authentication not configured');
    }

    let payload: { sub?: string };
    try {
      payload = await verifyToken(token, { secretKey });
    } catch (err) {
      this.logger.warn(`JWT verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      throw new UnauthorizedException('Token missing subject');
    }

    const user = await this.users.findByClerkId(clerkUserId);
    if (!user) {
      // Webhook hasn't synced yet, or user was deleted on our side.
      throw new UnauthorizedException('User not provisioned');
    }

    request.user = user;
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth || typeof auth !== 'string') return null;
    const [scheme, token] = auth.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
