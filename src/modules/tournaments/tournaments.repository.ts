import { Injectable } from '@nestjs/common';
import { Prisma, Tournament, TournamentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const TOURNAMENT_INCLUDE = {
  organizer: {
    select: {
      id: true,
      organizationName: true,
      verified: true,
    },
  },
} satisfies Prisma.TournamentInclude;

export type TournamentWithOrganizer = Prisma.TournamentGetPayload<{
  include: typeof TOURNAMENT_INCLUDE;
}>;

export interface TournamentFilters {
  status?: TournamentStatus;
  region?: string;
  modality?: 'SOLO_1V1' | 'TEAM_5V5' | 'ARAM';
  format?: string;
}

@Injectable()
export class TournamentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<TournamentWithOrganizer | null> {
    return this.prisma.tournament.findUnique({ where: { id }, include: TOURNAMENT_INCLUDE });
  }

  findBySlug(slug: string): Promise<TournamentWithOrganizer | null> {
    return this.prisma.tournament.findUnique({ where: { slug }, include: TOURNAMENT_INCLUDE });
  }

  slugExists(slug: string): Promise<boolean> {
    return this.prisma.tournament
      .count({ where: { slug } })
      .then((count) => count > 0);
  }

  create(data: Prisma.TournamentCreateInput): Promise<TournamentWithOrganizer> {
    return this.prisma.tournament.create({ data, include: TOURNAMENT_INCLUDE });
  }

  update(id: string, data: Prisma.TournamentUpdateInput): Promise<TournamentWithOrganizer> {
    return this.prisma.tournament.update({
      where: { id },
      data,
      include: TOURNAMENT_INCLUDE,
    });
  }

  delete(id: string): Promise<Tournament> {
    return this.prisma.tournament.delete({ where: { id } });
  }

  async search(
    filters: TournamentFilters,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: TournamentWithOrganizer[]; total: number }> {
    const where: Prisma.TournamentWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.region) where.region = filters.region;
    if (filters.modality) where.modality = filters.modality;
    if (filters.format) where.format = filters.format as Prisma.TournamentWhereInput['format'];

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tournament.findMany({
        where,
        include: TOURNAMENT_INCLUDE,
        orderBy: { startsAt: 'asc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.tournament.count({ where }),
    ]);
    return { items, total };
  }
}
