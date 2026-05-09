import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

const TAG_REGEX = /^[A-Za-z0-9]{2,6}$/;
const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/;

export class CreateTeamDto {
  @ApiProperty({
    description: 'Public team name',
    example: 'Quetzal Esports',
    minLength: 3,
    maxLength: 40,
  })
  @IsString()
  @Length(3, 40)
  name!: string;

  @ApiProperty({
    description: 'Short team tag (2-6 alphanumeric, case-insensitive — stored uppercase)',
    example: 'QTZ',
    pattern: '^[A-Za-z0-9]{2,6}$',
  })
  @IsString()
  @Matches(TAG_REGEX, {
    message: 'tag must be 2–6 letters or digits',
  })
  tag!: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'MX',
  })
  @IsString()
  @Matches(ISO_COUNTRY_REGEX, {
    message: 'country must be a 2-letter uppercase ISO code (e.g. MX)',
  })
  country!: string;

  @ApiPropertyOptional({ example: 'https://cdn.pulsogg.gg/teams/qtz.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
