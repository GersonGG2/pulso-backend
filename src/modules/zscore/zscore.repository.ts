import { Injectable } from '@nestjs/common';
import { Prisma, ZScoreEvent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ZScoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEventsByMatch(matchId: string): Promise<ZScoreEvent[]> {
    return this.prisma.zScoreEvent.findMany({ where: { matchId } });
  }

  async listForPlayer(
    playerId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: ZScoreEvent[]; total: number }> {
    const where: Prisma.ZScoreEventWhereInput = { playerId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.zScoreEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.zScoreEvent.count({ where }),
    ]);
    return { items, total };
  }
}
