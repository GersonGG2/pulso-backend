import { ApiPropertyOptional } from '@nestjs/swagger';
import { LolRole, PlayerTier } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const COUNTRY_REGEX = /^[A-Z]{2}$/;

/**
 * Query params for GET /players.
 * Used both for the public talent graph search and the leaderboard.
 */
export class SearchPlayersDto {
  @ApiPropertyOptional({ enum: LolRole })
  @IsOptional()
  @IsEnum(LolRole)
  role?: LolRole;

  @ApiPropertyOptional({ example: 'MX' })
  @IsOptional()
  @IsString()
  @Matches(COUNTRY_REGEX, { message: 'country must be a 2-letter ISO code' })
  country?: string;

  @ApiPropertyOptional({ enum: PlayerTier, description: 'Inclusive minimum tier' })
  @IsOptional()
  @IsEnum(PlayerTier)
  minTier?: PlayerTier;

  @ApiPropertyOptional({ description: 'Only players who opted into recruitment' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  recruitable?: boolean;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
