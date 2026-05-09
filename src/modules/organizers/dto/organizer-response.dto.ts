import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrganizerUserSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() username!: string;
  @ApiProperty() displayName!: string;
  @ApiPropertyOptional() avatarUrl!: string | null;
}

export class OrganizerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty() contactEmail!: string;
  @ApiPropertyOptional() contactPhone!: string | null;
  @ApiPropertyOptional() website!: string | null;
  @ApiProperty() verified!: boolean;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: OrganizerUserSummaryDto }) user!: OrganizerUserSummaryDto;
}

/** Private response — includes RFC, only returned to the organizer themselves or admins. */
export class PrivateOrganizerResponseDto extends OrganizerResponseDto {
  @ApiPropertyOptional() rfc!: string | null;
}
