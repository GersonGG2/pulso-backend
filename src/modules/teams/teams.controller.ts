import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateTeamDto } from './dto/create-team.dto';
import { SearchTeamsDto } from './dto/search-teams.dto';
import { AddTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';
import {
  TeamListResponseDto,
  TeamMemberResponseDto,
  TeamResponseDto,
} from './dto/team-response.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamWithMembers } from './teams.repository';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  // -----------------------------
  // Authenticated
  // -----------------------------

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a team and become its captain' })
  @ApiOkResponse({ type: TeamResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.toResponse(await this.teams.create(userId, dto));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update team metadata (captain only)' })
  @ApiOkResponse({ type: TeamResponseDto })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    return this.toResponse(await this.teams.update(userId, teamId, dto));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete team (captain only)' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
  ): Promise<void> {
    await this.teams.delete(userId, teamId);
  }

  @Post(':id/members')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a player to the team (captain only)' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teams.addMember(userId, teamId, dto);
  }

  @Patch(':id/members/:playerId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update member role or transfer captaincy (captain only)',
  })
  async updateMember(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Param('playerId') targetPlayerId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teams.updateMember(userId, teamId, targetPlayerId, dto);
  }

  @Delete(':id/members/:playerId')
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a member (captain) or leave the team (self)' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') teamId: string,
    @Param('playerId') targetPlayerId: string,
  ): Promise<void> {
    await this.teams.removeMember(userId, teamId, targetPlayerId);
  }

  // -----------------------------
  // Public
  // -----------------------------

  @Public()
  @Get()
  @ApiOperation({ summary: 'List teams publicly with optional country filter' })
  @ApiOkResponse({ type: TeamListResponseDto })
  async list(@Query() query: SearchTeamsDto): Promise<TeamListResponseDto> {
    const { items, total } = await this.teams.search(query);
    return {
      items: items.map((t) => this.toResponse(t)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a team public profile by id' })
  @ApiOkResponse({ type: TeamResponseDto })
  async getById(@Param('id') id: string): Promise<TeamResponseDto> {
    return this.toResponse(await this.teams.getById(id));
  }

  // -----------------------------
  // Mappers
  // -----------------------------

  private toResponse(team: TeamWithMembers): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      tag: team.tag,
      country: team.country,
      logoUrl: team.logoUrl,
      createdAt: team.createdAt,
      members: team.members.map((m) => this.toMemberResponse(m)),
    };
  }

  private toMemberResponse(member: TeamWithMembers['members'][number]): TeamMemberResponseDto {
    return {
      id: member.id,
      playerId: member.playerId,
      role: member.role,
      isCaptain: member.isCaptain,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      player: {
        id: member.player.id,
        username: member.player.user.username,
        displayName: member.player.user.displayName,
        avatarUrl: member.player.user.avatarUrl,
      },
    };
  }
}
