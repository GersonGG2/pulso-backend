import { Injectable } from '@nestjs/common';
import { Prisma, Team, TeamMember } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TEAM_INCLUDE = {
  members: {
    where: { leftAt: null },
    include: {
      player: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ isCaptain: 'desc' as const }, { joinedAt: 'asc' as const }],
  },
} satisfies Prisma.TeamInclude;

export type TeamWithMembers = Prisma.TeamGetPayload<{ include: typeof TEAM_INCLUDE }>;

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TeamWithMembers | null> {
    return this.prisma.team.findUnique({ where: { id }, include: TEAM_INCLUDE });
  }

  findByTag(tag: string): Promise<Team | null> {
    return this.prisma.team.findUnique({ where: { tag } });
  }

  /**
   * Atomically create a team and seed its captain member.
   */
  createWithCaptain(input: {
    name: string;
    tag: string;
    country: string;
    logoUrl?: string | null;
    captainPlayerId: string;
  }): Promise<TeamWithMembers> {
    return this.prisma.team.create({
      data: {
        name: input.name,
        tag: input.tag,
        country: input.country,
        logoUrl: input.logoUrl ?? null,
        members: {
          create: {
            playerId: input.captainPlayerId,
            role: 'STARTER',
            isCaptain: true,
          },
        },
      },
      include: TEAM_INCLUDE,
    });
  }

  update(id: string, data: Prisma.TeamUpdateInput): Promise<TeamWithMembers> {
    return this.prisma.team.update({ where: { id }, data, include: TEAM_INCLUDE });
  }

  delete(id: string): Promise<Team> {
    return this.prisma.team.delete({ where: { id } });
  }

  // -----------------------------
  // Members
  // -----------------------------

  findMember(teamId: string, playerId: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: { teamId_playerId: { teamId, playerId } },
    });
  }

  findCaptain(teamId: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findFirst({
      where: { teamId, isCaptain: true, leftAt: null },
    });
  }

  addMember(input: {
    teamId: string;
    playerId: string;
    role: 'STARTER' | 'SUBSTITUTE' | 'COACH' | 'MANAGER';
    isCaptain?: boolean;
  }): Promise<TeamMember> {
    return this.prisma.teamMember.create({
      data: {
        teamId: input.teamId,
        playerId: input.playerId,
        role: input.role,
        isCaptain: input.isCaptain ?? false,
      },
    });
  }

  updateMember(
    teamId: string,
    playerId: string,
    data: Prisma.TeamMemberUpdateInput,
  ): Promise<TeamMember> {
    return this.prisma.teamMember.update({
      where: { teamId_playerId: { teamId, playerId } },
      data,
    });
  }

  removeMember(teamId: string, playerId: string): Promise<TeamMember> {
    return this.prisma.teamMember.delete({
      where: { teamId_playerId: { teamId, playerId } },
    });
  }

  /**
   * Transfer captain in a single transaction:
   *   1. demote current captain (isCaptain=false)
   *   2. promote new captain (isCaptain=true)
   */
  transferCaptain(teamId: string, fromPlayerId: string, toPlayerId: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.update({
        where: { teamId_playerId: { teamId, playerId: fromPlayerId } },
        data: { isCaptain: false },
      });
      await tx.teamMember.update({
        where: { teamId_playerId: { teamId, playerId: toPlayerId } },
        data: { isCaptain: true },
      });
    });
  }

  async search(
    filters: { country?: string },
    pagination: { limit: number; offset: number },
  ): Promise<{ items: TeamWithMembers[]; total: number }> {
    const where: Prisma.TeamWhereInput = {};
    if (filters.country) where.country = filters.country;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        include: TEAM_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.team.count({ where }),
    ]);
    return { items, total };
  }
}
