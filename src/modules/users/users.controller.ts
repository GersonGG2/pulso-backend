import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrivateUserResponseDto, UserResponseDto } from './dto/user-response.dto';

/**
 * NOTE: Endpoints marked "TODO auth" use a temporary `x-user-id` header
 * for development. Replace with Clerk JWT guard once `auth` module lands.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user (private fields included)' })
  @ApiOkResponse({ type: PrivateUserResponseDto })
  async getMe(@Headers('x-user-id') userId: string): Promise<PrivateUserResponseDto> {
    const user = await this.users.getById(userId);
    return this.toPrivate(user);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiOkResponse({ type: PrivateUserResponseDto })
  async updateMe(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PrivateUserResponseDto> {
    const user = await this.users.updateProfile(userId, dto);
    return this.toPrivate(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user public profile by id' })
  @ApiParam({ name: 'id', example: 'clx123abc456' })
  @ApiOkResponse({ type: UserResponseDto })
  async getById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.users.getById(id);
    return this.toPublic(user);
  }

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

  private toPublic(user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: UserResponseDto['role'];
    createdAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private toPrivate(user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: UserResponseDto['role'];
    createdAt: Date;
    email: string;
  }): PrivateUserResponseDto {
    return {
      ...this.toPublic(user),
      email: user.email,
    };
  }
}
