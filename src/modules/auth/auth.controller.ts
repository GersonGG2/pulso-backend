import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { Webhook } from 'svix';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import {
  CLERK_WEBHOOK_HEADERS,
  ClerkUserData,
  ClerkWebhookEvent,
} from './dto/clerk-webhook.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('webhooks/clerk')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleClerkWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers(CLERK_WEBHOOK_HEADERS.id) svixId?: string,
    @Headers(CLERK_WEBHOOK_HEADERS.timestamp) svixTimestamp?: string,
    @Headers(CLERK_WEBHOOK_HEADERS.signature) svixSignature?: string,
  ): Promise<{ received: true }> {
    const secret = this.config.get<string>('CLERK_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('CLERK_WEBHOOK_SECRET not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing svix headers');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing request body');
    }

    let event: ClerkWebhookEvent;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(rawBody.toString('utf8'), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      this.logger.warn(`Invalid Clerk webhook signature: ${(err as Error).message}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Received Clerk event: ${event.type}`);

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await this.auth.syncUserFromClerk(event.data as ClerkUserData);
        break;
      case 'user.deleted':
        await this.auth.deleteUserByClerkId((event.data as { id: string }).id);
        break;
      default:
        this.logger.debug(`Ignoring unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
