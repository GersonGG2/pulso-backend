import { Injectable } from '@nestjs/common';
import { Organizer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ORGANIZER_INCLUDE = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.OrganizerInclude;

export type OrganizerWithUser = Prisma.OrganizerGetPayload<{ include: typeof ORGANIZER_INCLUDE }>;

@Injectable()
export class OrganizersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<OrganizerWithUser | null> {
    return this.prisma.organizer.findUnique({ where: { id }, include: ORGANIZER_INCLUDE });
  }

  findByUserId(userId: string): Promise<OrganizerWithUser | null> {
    return this.prisma.organizer.findUnique({ where: { userId }, include: ORGANIZER_INCLUDE });
  }

  create(data: Prisma.OrganizerCreateInput): Promise<OrganizerWithUser> {
    return this.prisma.organizer.create({ data, include: ORGANIZER_INCLUDE });
  }

  update(userId: string, data: Prisma.OrganizerUpdateInput): Promise<OrganizerWithUser> {
    return this.prisma.organizer.update({
      where: { userId },
      data,
      include: ORGANIZER_INCLUDE,
    });
  }

  async list(pagination: {
    limit: number;
    offset: number;
  }): Promise<{ items: OrganizerWithUser[]; total: number }> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.organizer.findMany({
        where: { verified: true },
        include: ORGANIZER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.limit,
      }),
      this.prisma.organizer.count({ where: { verified: true } }),
    ]);
    return { items, total };
  }
}
