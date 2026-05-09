import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { TeamMember } from '@prisma/client';
import { PlayersRepository } from '../players/players.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { SearchTeamsDto } from './dto/search-teams.dto';
import { AddTeamMemberDto, UpdateTeamMemberDto } from './dto/team-member.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamWithMembers, TeamsRepository } from './teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    private readonly teams: TeamsRepository,
    private readonly players: PlayersRepository,
  ) {}

  async getById(id: string): Promise<TeamWithMembers> {
    const team = await this.teams.findById(id);
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return team;
  }

  async create(userId: string, dto: CreateTeamDto): Promise<TeamWithMembers> {
    const player = await this.players.findByUserId(userId);
    if (!player) {
      throw new PreconditionFailedException(
        'Create your player profile before creating a team',
      );
    }

    const tag = dto.tag.toUpperCase();
    const taken = await this.teams.findByTag(tag);
    if (taken) {
      throw new ConflictException(`Team tag "${tag}" is already taken`);
    }

    return this.teams.createWithCaptain({
      name: dto.name,
      tag,
      country: dto.country,
      logoUrl: dto.logoUrl ?? null,
      captainPlayerId: player.id,
    });
  }

  async update(
    userId: string,
    teamId: string,
    dto: UpdateTeamDto,
  ): Promise<TeamWithMembers> {
    await this.assertCaptain(userId, teamId);

    return this.teams.update(teamId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
    });
  }

  async delete(userId: string, teamId: string): Promise<void> {
    await this.assertCaptain(userId, teamId);
    await this.teams.delete(teamId);
  }

  async search(query: SearchTeamsDto) {
    return this.teams.search(
      { country: query.country },
      { limit: query.limit, offset: query.offset },
    );
  }

  // -----------------------------
  // Members
  // -----------------------------

  async addMember(userId: string, teamId: string, dto: AddTeamMemberDto): Promise<TeamMember> {
    await this.assertCaptain(userId, teamId);

    const target = await this.players.findById(dto.playerId);
    if (!target) throw new NotFoundException(`Player ${dto.playerId} not found`);

    const existing = await this.teams.findMember(teamId, dto.playerId);
    if (existing && !existing.leftAt) {
      throw new ConflictException('Player is already a member of this team');
    }

    if (dto.isCaptain) {
      throw new BadRequestException(
        'Use PATCH on a member with isCaptain=true to transfer captaincy after they join',
      );
    }

    return this.teams.addMember({
      teamId,
      playerId: dto.playerId,
      role: dto.role,
    });
  }

  async updateMember(
    userId: string,
    teamId: string,
    targetPlayerId: string,
    dto: UpdateTeamMemberDto,
  ): Promise<TeamMember> {
    const captain = await this.assertCaptain(userId, teamId);

    const target = await this.teams.findMember(teamId, targetPlayerId);
    if (!target || target.leftAt) {
      throw new NotFoundException('Member not found in this team');
    }

    // Captain transfer
    if (dto.isCaptain === true && targetPlayerId !== captain.playerId) {
      await this.teams.transferCaptain(teamId, captain.playerId, targetPlayerId);
    } else if (dto.isCaptain === false && targetPlayerId === captain.playerId) {
      throw new BadRequestException(
        'Captains cannot demote themselves directly. Transfer captaincy to another member first.',
      );
    }

    if (dto.role !== undefined) {
      return this.teams.updateMember(teamId, targetPlayerId, { role: dto.role });
    }

    return this.teams.findMember(teamId, targetPlayerId).then((m) => m!);
  }

  async removeMember(userId: string, teamId: string, targetPlayerId: string): Promise<void> {
    const team = await this.getById(teamId);
    const requester = await this.players.findByUserId(userId);
    if (!requester) throw new ForbiddenException('No player profile');

    const captain = team.members.find((m) => m.isCaptain);
    if (!captain) throw new NotFoundException('Team has no captain'); // shouldn't happen

    const target = team.members.find((m) => m.playerId === targetPlayerId && !m.leftAt);
    if (!target) throw new NotFoundException('Member not found in this team');

    const isSelf = requester.id === targetPlayerId;
    const isCaptainAction = captain.playerId === requester.id;

    if (!isSelf && !isCaptainAction) {
      throw new ForbiddenException('Only the captain can remove other members');
    }

    if (target.isCaptain && team.members.filter((m) => !m.leftAt).length > 1) {
      throw new BadRequestException(
        'The captain cannot leave the team while other members remain. Transfer captaincy first.',
      );
    }

    await this.teams.removeMember(teamId, targetPlayerId);
  }

  // -----------------------------
  // Internal
  // -----------------------------

  private async assertCaptain(userId: string, teamId: string): Promise<{ playerId: string }> {
    const player = await this.players.findByUserId(userId);
    if (!player) throw new ForbiddenException('No player profile');

    const captain = await this.teams.findCaptain(teamId);
    if (!captain) throw new NotFoundException(`Team ${teamId} not found`);

    if (captain.playerId !== player.id) {
      throw new ForbiddenException('Only the team captain can perform this action');
    }
    return { playerId: player.id };
  }
}
