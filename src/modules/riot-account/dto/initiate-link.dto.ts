import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';

const REGIONS = ['LAN', 'LAS', 'NA'] as const;

export class InitiateLinkDto {
  @ApiProperty({
    description: 'Riot ID game name (the part before the # in your full Riot ID)',
    example: 'Faker',
    minLength: 3,
    maxLength: 16,
  })
  @IsString()
  @Length(3, 16)
  gameName!: string;

  @ApiProperty({
    description: 'Riot ID tag line (the part after the # — usually 3-5 characters)',
    example: 'KR1',
    minLength: 3,
    maxLength: 5,
  })
  @IsString()
  @Length(3, 5)
  tagLine!: string;

  @ApiProperty({
    description: 'LoL server region',
    enum: REGIONS,
    example: 'LAN',
  })
  @IsIn(REGIONS)
  region!: 'LAN' | 'LAS' | 'NA';
}

export class InitiateLinkResponseDto {
  @ApiProperty({
    description: 'Profile icon ID the user must set in their LoL client to verify ownership',
    example: 28,
  })
  expectedIconId!: number;

  @ApiProperty({
    description: 'Original icon to restore after verification (UI hint)',
    example: 5,
  })
  originalIconId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Resolved Riot ID confirmed via Riot Account-V1',
    example: 'Faker#KR1',
  })
  riotId!: string;

  @ApiProperty({
    description: 'Human-friendly instructions in the user locale',
    example:
      'Cambia tu icono de invocador al ID 28 en tu cliente de League of Legends, y luego confirma. Tienes 15 minutos.',
  })
  instructions!: string;
}
