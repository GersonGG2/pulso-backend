import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LolRole, PlayerTier } from '@prisma/client';

class PlayerUserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

class PlayerRiotAccountSummaryDto {
  @ApiProperty() gameName!: string;
  @ApiProperty() tagLine!: string;
  @ApiProperty() region!: string;
  @ApiPropertyOptional() summonerLevel!: number | null;
  @ApiPropertyOptional() currentTier!: string | null;
  @ApiPropertyOptional() currentRank!: string | null;
  @ApiPropertyOptional() highestRankEver!: string | null;
}

export class PlayerResponseDto {
  @ApiProperty() id!: string;

  @ApiPropertyOptional({ enum: LolRole })
  primaryRole!: LolRole | null;

  @ApiPropertyOptional({ enum: LolRole })
  secondaryRole!: LolRole | null;

  @ApiProperty({ example: 'MX' })
  country!: string;

  @ApiPropertyOptional({ example: 'Monterrey' })
  city!: string | null;

  @ApiProperty({ example: 1500 })
  zScore!: number;

  @ApiProperty({ enum: PlayerTier, example: PlayerTier.AMATEUR })
  tier!: PlayerTier;

  @ApiProperty({ example: false })
  isPro!: boolean;

  @ApiProperty({ example: true })
  recruitable!: boolean;

  @ApiProperty({ type: PlayerUserSummaryDto })
  user!: PlayerUserSummaryDto;

  @ApiPropertyOptional({ type: PlayerRiotAccountSummaryDto })
  riotAccount!: PlayerRiotAccountSummaryDto | null;
}

export class PlayerListResponseDto {
  @ApiProperty({ type: [PlayerResponseDto] })
  items!: PlayerResponseDto[];

  @ApiProperty({ example: 173 })
  total!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;
}
