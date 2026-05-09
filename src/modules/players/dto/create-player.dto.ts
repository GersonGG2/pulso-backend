import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LolRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const ISO_COUNTRY_REGEX = /^[A-Z]{2}$/;

export class CreatePlayerDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code (uppercase)',
    example: 'MX',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(ISO_COUNTRY_REGEX, {
    message: 'country must be a 2-letter uppercase ISO code (e.g. MX, AR, CL)',
  })
  country!: string;

  @ApiPropertyOptional({ enum: LolRole, example: LolRole.MID })
  @IsOptional()
  @IsEnum(LolRole)
  primaryRole?: LolRole;

  @ApiPropertyOptional({ enum: LolRole, example: LolRole.JUNGLE })
  @IsOptional()
  @IsEnum(LolRole)
  secondaryRole?: LolRole;

  @ApiPropertyOptional({ example: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601). Used for tournament age brackets and KYC.',
    example: '2003-06-15',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @ApiPropertyOptional({
    description: 'Whether scouts/orgs can contact you via the recruitment marketplace',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  recruitable?: boolean;
}
