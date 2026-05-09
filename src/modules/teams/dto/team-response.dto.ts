import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';

class TeamMemberPlayerSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

export class TeamMemberResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() playerId!: string;
  @ApiProperty({ enum: TeamRole }) role!: TeamRole;
  @ApiProperty() isCaptain!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) joinedAt!: Date;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) leftAt!: Date | null;
  @ApiProperty({ type: TeamMemberPlayerSummaryDto }) player!: TeamMemberPlayerSummaryDto;
}

export class TeamResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() tag!: string;
  @ApiProperty() country!: string;
  @ApiPropertyOptional() logoUrl!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: [TeamMemberResponseDto] }) members!: TeamMemberResponseDto[];
}

export class TeamListResponseDto {
  @ApiProperty({ type: [TeamResponseDto] }) items!: TeamResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() offset!: number;
}
