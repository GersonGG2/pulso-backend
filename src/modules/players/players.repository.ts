import { Injectable } from '@nestjs/common';
import { LolRole, Player, PlayerTier, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TIER_RANK } from './players.utils';

const PLAYER_INCLUDE = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      riotAccount: {
        select: {
          gameName: true,
          tagLine: true,
          region: true,
          summonerLevel: true,
          currentTier: true,
          currentRank: true,
          highestRankEver: true,
        },
      },
    },
  },
} satisfies Prisma.PlayerInclude;

export type PlayerWithRelations = Prisma.PlayerGetPayload<{ include: typeof PLAYER_INCLUDE }>;

export interface PlayerFilters {
  role?: LolRole;
  country?: string;
  minTier?: PlayerTier;
  recruitable?: boolean;
}

@Injectable()
export class PlayersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<PlayerWithRelations | null> {
    return this.prisma.player.findUnique({ where: { id }, include: PLAYER_INCLUDE });
  }

  findByUserId(userId: string): Promise<PlayerWithRelations | null> {
    return this.prisma.player.findUnique({ where: { userId }, include: PLAYER_INCLUDE });
  }

  create(data: Prisma.PlayerCreateInput): Promise<Player> {
    return this.prisma.player.create({ data });
  }

  update(userId: string, data: Prisma.PlayerUpdateInput): Promise<PlayerWithRelations> {
    return this.prisma.player.update({
      where: { userId },
      data,
      include: PLAYER_INCLUDE,
    });
  }

  delete(userId: string): Promise<Player> {
    return this.prisma.player.delete({ where: { userId } });
  }

  async search(
    filters: PlayerFilters,
    pagination: { limit: number; offset: number },
    orderBy: Prisma.PlayerOrderByWithRelationInput = { zScore: 'desc' },
  ): Promise<{ items: PlayerWithRelations[]; total: number }> {
    const where = this.buildWhere(filters);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.player.findMany({
        where,
        include: PLAYER_INCLUDE,
        orderBy,
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.player.count({ where }),
    ]);
    return { items, total };
  }

  private buildWhere(filters: PlayerFilters): Prisma.PlayerWhereInput {
    const where: Prisma.PlayerWhereInput = {};

    if (filters.role) where.primaryRole = filters.role;
    if (filters.country) where.country = filters.country;
    if (filters.recruitable !== undefined) where.recruitable = filters.recruitable;

    if (filters.minTier) {
      const minRank = TIER_RANK[filters.minTier];
      const allowedTiers = (Object.keys(TIER_RANK) as PlayerTier[]).filter(
        (t) => TIER_RANK[t] >= minRank,
      );
      where.tier = { in: allowedTiers };
    }

    return where;
  }
}
