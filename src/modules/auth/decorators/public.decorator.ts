import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as publicly accessible. The global ClerkGuard will skip
 * authentication for handlers (or controllers) decorated with @Public().
 *
 * Usage:
 *   @Public()
 *   @Get('leaderboard')
 *   getLeaderboard() { ... }
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
