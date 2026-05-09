import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @ApiPropertyOptional({
    description:
      'Required for team modalities (TEAM_5V5). Omit for solo modalities (SOLO_1V1, ARAM).',
    example: 'clx_team_42',
  })
  @IsOptional()
  @IsString()
  teamId?: string;
}
