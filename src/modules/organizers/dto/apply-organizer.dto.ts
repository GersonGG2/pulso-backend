import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUrl, Length, Matches } from 'class-validator';

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;

export class ApplyOrganizerDto {
  @ApiProperty({
    description: 'Public organization name shown across the platform',
    example: 'Liga Pulso CDMX',
    minLength: 3,
    maxLength: 80,
  })
  @IsString()
  @Length(3, 80)
  organizationName!: string;

  @ApiProperty({ example: 'contacto@ligapulsocdmx.mx' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({
    description: 'RFC for tax/invoicing (Mexican organizers handling cash prizes)',
    example: 'GAGE920101AB1',
  })
  @IsOptional()
  @IsString()
  @Matches(RFC_REGEX, { message: 'rfc must follow the Mexican RFC format' })
  rfc?: string;

  @ApiPropertyOptional({ example: '+525512345678' })
  @IsOptional()
  @IsPhoneNumber(undefined)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://ligapulsocdmx.mx' })
  @IsOptional()
  @IsUrl()
  website?: string;
}
