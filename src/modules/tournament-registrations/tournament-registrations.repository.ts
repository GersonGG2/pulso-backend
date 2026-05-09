import { Injectable } from '@nestjs/common';
import { Prisma, RegistrationStatus, TournamentRegistration } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const REGISTRATION_INCLUDE = {
  player: {
    select: {
      id: true,
      user: { select: { username: true, displayName: true } },
    },
  },
  team: {
    select: { id: true, name: true, tag: true },
  },
} satisfies Prisma.TournamentRegistrationInclude;

export type RegistrationWithRelations = Prisma.TournamentRegistrationGetPayload<{
  include: typeof REGISTRATION_INCLUDE;
}>;

const ACTIVE_STATUSES: RegistrationStatus[] = [
  RegistrationStatus.PENDING_PAYMENT,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.CHECKED_IN,
];

@Injectable()
export class TournamentRegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<RegistrationWithRelations | null> {
    return this.prisma.tournamentRegistration.findUnique({
      where: { id },
      include: REGISTRATION_INCLUDE,
    });
  }

  findActiveForPlayer(
    tournamentId: string,
    playerId: string,
  ): Promise<TournamentRegistration | null> {
    return this.prisma.tournamentRegistration.findFirst({
      where: { tournamentId, playerId, status: { in: ACTIVE_STATUSES } },
    });
  }

  findActiveForTeam(
    tournamentId: string,
    teamId: string,
  ): Promise<TournamentRegistration | null> {
    return this.prisma.tournamentRegistration.findFirst({
      where: { tournamentId, teamId, status: { in: ACTIVE_STATUSES } },
    });
  }

  countActive(tournamentId: string): Promise<number> {
    return this.prisma.tournamentRegistration.count({
      where: { tournamentId, status: { in: ACTIVE_STATUSES } },
    });
  }

  create(data: Prisma.TournamentRegistrationCreateInput): Promise<RegistrationWithRelations> {
    return this.prisma.tournamentRegistration.create({
      data,
      include: REGISTRATION_INCLUDE,
    });
  }

  update(
    id: string,
    data: Prisma.TournamentRegistrationUpdateInput,
  ): Promise<RegistrationWithRelations> {
    return this.prisma.tournamentRegistration.update({
      where: { id },
      data,
      include: REGISTRATION_INCLUDE,
    });
  }

  async listByTournament(
    tournamentId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: RegistrationWithRelations[]; total: number }> {
    const where: Prisma.TournamentRegistrationWhereInput = { tournamentId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tournamentRegistration.findMany({
        where,
        include: REGISTRATION_INCLUDE,
        orderBy: { registeredAt: 'asc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.tournamentRegistration.count({ where }),
    ]);
    return { items, total };
  }
}
