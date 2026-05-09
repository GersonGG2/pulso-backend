import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Public display name shown across the platform',
    example: 'Faker MX',
    minLength: 2,
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Unique URL-safe handle (a–z, 0–9, _ ., -)',
    example: 'faker_mx',
    minLength: 3,
    maxLength: 24,
  })
  @IsOptional()
  @IsString()
  @Length(3, 24)
  @Matches(/^[a-z0-9_.-]+$/, {
    message: 'username must be lowercase letters, numbers, underscores, dots, or dashes',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Public avatar URL',
    example: 'https://cdn.pulsogg.gg/avatars/abc123.png',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
