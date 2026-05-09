import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivateUserResponseDto, UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user (private fields included)' })
  @ApiOkResponse({ type: PrivateUserResponseDto })
  async getMe(@CurrentUser() user: User): Promise<PrivateUserResponseDto> {
    return this.toPrivate(user);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ type: PrivateUserResponseDto })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PrivateUserResponseDto> {
    const updated = await this.users.updateProfile(userId, dto);
    return this.toPrivate(updated);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a user public profile by id' })
  @ApiParam({ name: 'id', example: 'clx123abc456' })
  @ApiOkResponse({ type: UserResponseDto })
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.users.getById(id);
    return this.toPublic(user);
  }

  @Public()
  @Get('by-username/:username')
  @ApiOperation({ summary: 'Get a user public profile by username' })
  @ApiParam({ name: 'username', example: 'faker_mx' })
  @ApiOkResponse({ type: UserResponseDto })
  async getByUsername(@Param('username') username: string): Promise<UserResponseDto> {
    const user = await this.users.getByUsername(username);
    return this.toPublic(user);
  }

  // -----------------------------
  // Mappers
  // -----------------------------

  private toPublic(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private toPrivate(user: User): PrivateUserResponseDto {
    return {
      ...this.toPublic(user),
      email: user.email,
    };
  }
}
