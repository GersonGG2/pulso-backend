import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeamRole } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'Player id to add to the team',
    example: 'clx_player_42',
  })
  @IsString()
  playerId!: string;

  @ApiProperty({ enum: TeamRole, default: TeamRole.STARTER })
  @IsEnum(TeamRole)
  role!: TeamRole;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: TeamRole })
  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @ApiPropertyOptional({
    description:
      'Set to true to transfer captaincy to this member. The previous captain is demoted automatically.',
  })
  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;
}
