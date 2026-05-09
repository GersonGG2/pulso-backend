import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BracketType,
  Modality,
  PlayerTier,
  TournamentFormat,
  TournamentStatus,
} from '@prisma/client';

class TournamentOrganizerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty() verified!: boolean;
}

export class TournamentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional() bannerUrl!: string | null;

  @ApiProperty({ enum: TournamentFormat }) format!: TournamentFormat;
  @ApiProperty({ enum: Modality }) modality!: Modality;
  @ApiProperty({ enum: BracketType }) bracketType!: BracketType;
  @ApiProperty({ enum: TournamentStatus }) status!: TournamentStatus;

  @ApiProperty() region!: string;

  @ApiPropertyOptional({ enum: PlayerTier }) minTier!: PlayerTier | null;
  @ApiPropertyOptional({ enum: PlayerTier }) maxTier!: PlayerTier | null;

  @ApiProperty() maxParticipants!: number;
  @ApiProperty() entryFeeMxnCents!: number;
  @ApiPropertyOptional() prizePool!: Record<string, unknown> | null;

  @ApiProperty({ type: String, format: 'date-time' }) registrationOpensAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) registrationClosesAt!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) endsAt!: Date | null;

  @ApiProperty() rulesetVersion!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;

  @ApiProperty({ type: TournamentOrganizerSummaryDto })
  organizer!: TournamentOrganizerSummaryDto;
}

export class TournamentListResponseDto {
  @ApiProperty({ type: [TournamentResponseDto] }) items!: TournamentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
