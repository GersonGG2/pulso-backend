import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Inject the authenticated User from the request.
 * Populated by ClerkGuard after JWT verification (or x-user-id fallback in dev).
 *
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: User) { ... }
 *
 *   @Get('id')
 *   getMyId(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
