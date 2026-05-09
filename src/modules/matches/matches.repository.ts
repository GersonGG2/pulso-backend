import { Injectable } from '@nestjs/common';
import { Match, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MATCH_INCLUDE = {
  participants: {
    include: {
      player: {
        select: {
          id: true,
          user: { select: { username: true, displayName: true } },
        },
      },
    },
    orderBy: { side: 'asc' as const },
  },
} satisfies Prisma.MatchInclude;

export type MatchWithParticipants = Prisma.MatchGetPayload<{ include: typeof MATCH_INCLUDE }>;

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<MatchWithParticipants | null> {
    return this.prisma.match.findUnique({ where: { id }, include: MATCH_INCLUDE });
  }

  findByTournamentId(tournamentId: string): Promise<MatchWithParticipants[]> {
    return this.prisma.match.findMany({
      where: { tournamentId },
      include: MATCH_INCLUDE,
      orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }],
    });
  }

  findByPosition(
    tournamentId: string,
    bracketPosition: string,
  ): Promise<MatchWithParticipants | null> {
    return this.prisma.match.findFirst({
      where: { tournamentId, bracketPosition },
      include: MATCH_INCLUDE,
    });
  }

  countByTournamentId(tournamentId: string): Promise<number> {
    return this.prisma.match.count({ where: { tournamentId } });
  }

  /**
   * Atomically create a match and seed its two participants.
   */
  createWithParticipants(input: {
    tournamentId: string;
    round: number;
    bracketPosition: string;
    scheduledAt: Date;
    bluePlayerId: string;
    redPlayerId: string;
  }): Promise<MatchWithParticipants> {
    return this.prisma.match.create({
      data: {
        tournament: { connect: { id: input.tournamentId } },
        round: input.round,
        bracketPosition: input.bracketPosition,
        scheduledAt: input.scheduledAt,
        participants: {
          create: [
            { side: 'BLUE', player: { connect: { id: input.bluePlayerId } } },
            { side: 'RED', player: { connect: { id: input.redPlayerId } } },
          ],
        },
      },
      include: MATCH_INCLUDE,
    });
  }

  update(id: string, data: Prisma.MatchUpdateInput): Promise<MatchWithParticipants> {
    return this.prisma.match.update({ where: { id }, data, include: MATCH_INCLUDE });
  }

  /** Returns the matches that share a round and have COMPLETED status, ordered by position. */
  findCompletedSiblings(
    tournamentId: string,
    round: number,
  ): Promise<MatchWithParticipants[]> {
    return this.prisma.match.findMany({
      where: { tournamentId, round, status: 'COMPLETED' },
      include: MATCH_INCLUDE,
      orderBy: { bracketPosition: 'asc' },
    });
  }

  setParticipantWin(matchId: string, side: string, win: boolean): Promise<unknown> {
    return this.prisma.matchParticipant.updateMany({
      where: { matchId, side },
      data: { win },
    });
  }
}
