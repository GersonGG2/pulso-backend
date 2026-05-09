import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'clx123abc456...' })
  id!: string;

  @ApiProperty({ example: 'faker_mx' })
  username!: string;

  @ApiProperty({ example: 'Faker MX' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.pulsogg.gg/avatars/abc123.png' })
  avatarUrl!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.PLAYER })
  role!: UserRole;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

/**
 * Privately-scoped user response — includes email and other PII.
 * Only return to the user themselves (GET /users/me) or to admins.
 */
export class PrivateUserResponseDto extends UserResponseDto {
  @ApiProperty({ example: 'gerson@example.com' })
  email!: string;
}
