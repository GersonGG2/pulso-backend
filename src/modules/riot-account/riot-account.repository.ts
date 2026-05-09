import { Injectable } from '@nestjs/common';
import { Prisma, RiotAccount, RiotLinkAttempt } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RiotAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  // RiotAccount

  findByUserId(userId: string): Promise<RiotAccount | null> {
    return this.prisma.riotAccount.findUnique({ where: { userId } });
  }

  findByPuuid(puuid: string): Promise<RiotAccount | null> {
    return this.prisma.riotAccount.findUnique({ where: { puuid } });
  }

  upsert(
    userId: string,
    create: Prisma.RiotAccountCreateInput,
    update: Prisma.RiotAccountUpdateInput,
  ): Promise<RiotAccount> {
    return this.prisma.riotAccount.upsert({
      where: { userId },
      create,
      update,
    });
  }

  delete(userId: string): Promise<RiotAccount> {
    return this.prisma.riotAccount.delete({ where: { userId } });
  }

  // RiotLinkAttempt

  findAttemptByUserId(userId: string): Promise<RiotLinkAttempt | null> {
    return this.prisma.riotLinkAttempt.findUnique({ where: { userId } });
  }

  upsertAttempt(
    userId: string,
    data: Omit<Prisma.RiotLinkAttemptCreateInput, 'user'>,
  ): Promise<RiotLinkAttempt> {
    return this.prisma.riotLinkAttempt.upsert({
      where: { userId },
      create: { ...data, user: { connect: { id: userId } } },
      update: data,
    });
  }

  deleteAttempt(userId: string): Promise<RiotLinkAttempt | null> {
    return this.prisma.riotLinkAttempt
      .delete({ where: { userId } })
      .catch(() => null);
  }
}
