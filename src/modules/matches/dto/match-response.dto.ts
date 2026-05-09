import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LolRole, MatchStatus } from '@prisma/client';

class MatchPlayerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
}

export class MatchParticipantResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['BLUE', 'RED'] }) side!: string;
  @ApiPropertyOptional({ enum: LolRole }) role!: LolRole | null;
  @ApiPropertyOptional() championPlayed!: string | null;

  @ApiPropertyOptional() kills!: number | null;
  @ApiPropertyOptional() deaths!: number | null;
  @ApiPropertyOptional() assists!: number | null;
  @ApiPropertyOptional() cs!: number | null;
  @ApiPropertyOptional() visionScore!: number | null;
  @ApiPropertyOptional() goldEarned!: number | null;
  @ApiPropertyOptional() damageDealt!: number | null;
  @ApiPropertyOptional() goldDiff15!: number | null;
  @ApiPropertyOptional() csPerMin!: number | null;

  @ApiPropertyOptional() win!: boolean | null;
  @ApiPropertyOptional() zScoreDelta!: number | null;

  @ApiProperty({ type: MatchPlayerSummaryDto }) player!: MatchPlayerSummaryDto;
}

export class MatchResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tournamentId!: string;
  @ApiProperty() round!: number;
  @ApiProperty() bracketPosition!: string;
  @ApiProperty({ enum: MatchStatus }) status!: MatchStatus;

  @ApiProperty({ type: String, format: 'date-time' }) scheduledAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) startedAt!: Date | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) finishedAt!: Date | null;

  @ApiPropertyOptional() riotMatchId!: string | null;
  @ApiPropertyOptional() tournamentCode!: string | null;
  @ApiPropertyOptional() winnerSide!: string | null;

  @ApiProperty({ type: [MatchParticipantResponseDto] })
  participants!: MatchParticipantResponseDto[];
}

export class MatchListResponseDto {
  @ApiProperty({ type: [MatchResponseDto] }) items!: MatchResponseDto[];
  @ApiProperty() total!: number;
}
