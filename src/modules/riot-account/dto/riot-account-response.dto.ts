import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RiotAccountResponseDto {
  @ApiProperty({ example: 'clx_riotacc_1' })
  id!: string;

  @ApiProperty({ example: 'Faker' })
  gameName!: string;

  @ApiProperty({ example: 'KR1' })
  tagLine!: string;

  @ApiProperty({ example: 'LAN' })
  region!: string;

  @ApiPropertyOptional({ example: 312 })
  summonerLevel!: number | null;

  @ApiPropertyOptional({ example: 'GOLD' })
  currentTier!: string | null;

  @ApiPropertyOptional({ example: 'II' })
  currentRank!: string | null;

  @ApiPropertyOptional({ example: 47 })
  currentLP!: number | null;

  @ApiPropertyOptional({ example: 'DIAMOND' })
  highestRankEver!: string | null;

  @ApiProperty({ example: false })
  smsVerified!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  linkedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  lastSyncedAt!: Date;
}
