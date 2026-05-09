import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationStatus } from '@prisma/client';

class PlayerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
}

class TeamSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() tag!: string;
}

export class RegistrationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tournamentId!: string;
  @ApiProperty({ enum: RegistrationStatus }) status!: RegistrationStatus;

  @ApiPropertyOptional({ type: PlayerSummaryDto }) player!: PlayerSummaryDto | null;
  @ApiPropertyOptional({ type: TeamSummaryDto }) team!: TeamSummaryDto | null;

  @ApiPropertyOptional({ type: String, format: 'date-time' }) paidAt!: Date | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) checkedInAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) registeredAt!: Date;
}

export class RegistrationListResponseDto {
  @ApiProperty({ type: [RegistrationResponseDto] }) items!: RegistrationResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
