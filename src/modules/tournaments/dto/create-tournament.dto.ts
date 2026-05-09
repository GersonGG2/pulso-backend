import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BracketType,
  Modality,
  PlayerTier,
  TournamentFormat,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateTournamentDto {
  @ApiProperty({ example: 'Pulso Cup MX — Mayo 2026', minLength: 5, maxLength: 80 })
  @IsString()
  @Length(5, 80)
  name!: string;

  @ApiProperty({ example: 'Torneo abierto LoL 5v5 LAN. Bo3 hasta finales (Bo5).' })
  @IsString()
  @Length(20, 4000)
  description!: string;

  @ApiPropertyOptional({ example: 'https://cdn.pulsogg.gg/tournaments/may26.png' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiProperty({ enum: TournamentFormat })
  @IsEnum(TournamentFormat)
  format!: TournamentFormat;

  @ApiProperty({ enum: Modality })
  @IsEnum(Modality)
  modality!: Modality;

  @ApiProperty({ enum: BracketType })
  @IsEnum(BracketType)
  bracketType!: BracketType;

  @ApiProperty({ example: 'MX', description: 'Region key (MX, LATAM-NORTH, LATAM-SOUTH, etc.)' })
  @IsString()
  @Length(2, 24)
  region!: string;

  @ApiPropertyOptional({ enum: PlayerTier })
  @IsOptional()
  @IsEnum(PlayerTier)
  minTier?: PlayerTier;

  @ApiPropertyOptional({ enum: PlayerTier })
  @IsOptional()
  @IsEnum(PlayerTier)
  maxTier?: PlayerTier;

  @ApiProperty({ example: 32, minimum: 2, maximum: 1024 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(1024)
  maxParticipants!: number;

  @ApiPropertyOptional({
    description: 'Entry fee in MXN cents (e.g. 5000 = $50 MXN). 0 = free entry.',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  entryFeeMxnCents: number = 0;

  @ApiPropertyOptional({
    description: 'Prize pool structure. Free-form JSON; convention: { first, second, third, zscore }',
    example: { first: { mxn: 0, items: ['HyperX Cloud II'] }, zscore: { first: 200, second: 100 } },
  })
  @IsOptional()
  @IsObject()
  prizePool?: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  registrationOpensAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  registrationClosesAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ example: '1.0.0', description: 'Versioned ruleset reference' })
  @IsString()
  @Length(1, 24)
  rulesetVersion!: string;
}
