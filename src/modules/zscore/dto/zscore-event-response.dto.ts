import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZScoreSource } from '@prisma/client';

export class ZScoreEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() playerId!: string;
  @ApiProperty({ enum: ZScoreSource }) source!: ZScoreSource;
  @ApiProperty() delta!: number;
  @ApiProperty() newScore!: number;
  @ApiPropertyOptional() matchId!: string | null;
  @ApiPropertyOptional() tournamentId!: string | null;
  @ApiPropertyOptional() metadata!: Record<string, unknown> | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class ZScoreEventListResponseDto {
  @ApiProperty({ type: [ZScoreEventResponseDto] }) items!: ZScoreEventResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
