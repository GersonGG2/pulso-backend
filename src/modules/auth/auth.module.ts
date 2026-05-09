import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { UsersRepository } from '../users/users.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClerkGuard } from './guards/clerk.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    {
      provide: APP_GUARD,
      useClass: ClerkGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
