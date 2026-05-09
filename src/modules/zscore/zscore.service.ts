import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ZScoreSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { tierFromZScore } from '../players/players.utils';
import { ZScoreRepository } from './zscore.repository';
import { computeDelta, MatchContext, RatingSnapshot } from './zscore.engine';

@Injectable()
export class ZScoreService {
  private readonly logger = new Logger(ZScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ZScoreRepository,
  ) {}

  /**
   * Idempotent: applies ZScore deltas for a COMPLETED match.
   * - Reads winner/loser participants
   * - Computes Elo + bonifiers via the engine
   * - Updates Player.zScore + tier and persists ZScoreEvent rows
   *   AND MatchParticipant.zScoreDelta — all in one transaction
   *
   * Re-running on the same match is a no-op (events already exist).
   */
  async applyMatchResult(matchId: string): Promise<void> {
    const already = await this.events.findEventsByMatch(matchId);
    if (already.length > 0) {
      this.logger.debug(`Skipping match ${matchId}: zscore events already exist`);
      return;
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          include: { player: true },
        },
      },
    });
    if (!match || match.status !== 'COMPLETED') return;

    const winnerP = match.participants.find((p) => p.win === true);
    const loserP = match.participants.find((p) => p.win === false);
    if (!winnerP || !loserP) {
      this.logger.warn(`Match ${matchId} is COMPLETED but missing winner/loser`);
      return;
    }

    const winnerSnapshot: RatingSnapshot = {
      zScore: winnerP.player.zScore,
      tier: winnerP.player.tier,
    };
    const loserSnapshot: RatingSnapshot = {
      zScore: loserP.player.zScore,
      tier: loserP.player.tier,
    };

    // Tournament weight: AMATEUR for now. Promote tournaments to OFFICIAL/FLAGSHIP
    // via Tournament.weight column when we add it.
    const context: MatchContext = { weight: 'AMATEUR' };

    const winnerResult = computeDelta(winnerSnapshot, loserSnapshot, 1, context);
    const loserResult = computeDelta(loserSnapshot, winnerSnapshot, 0, context);

    const winnerNew = winnerSnapshot.zScore + winnerResult.delta;
    const loserNew = loserSnapshot.zScore + loserResult.delta;

    await this.prisma.$transaction([
      this.prisma.player.update({
        where: { id: winnerP.player.id },
        data: { zScore: winnerNew, tier: tierFromZScore(winnerNew) },
      }),
      this.prisma.player.update({
        where: { id: loserP.player.id },
        data: { zScore: loserNew, tier: tierFromZScore(loserNew) },
      }),
      this.prisma.matchParticipant.update({
        where: { id: winnerP.id },
        data: { zScoreDelta: winnerResult.delta },
      }),
      this.prisma.matchParticipant.update({
        where: { id: loserP.id },
        data: { zScoreDelta: loserResult.delta },
      }),
      this.prisma.zScoreEvent.create({
        data: {
          player: { connect: { id: winnerP.player.id } },
          source: ZScoreSource.MATCH_RESULT,
          delta: winnerResult.delta,
          newScore: winnerNew,
          matchId,
          tournamentId: match.tournamentId,
          metadata: winnerResult.breakdown as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.zScoreEvent.create({
        data: {
          player: { connect: { id: loserP.player.id } },
          source: ZScoreSource.MATCH_RESULT,
          delta: loserResult.delta,
          newScore: loserNew,
          matchId,
          tournamentId: match.tournamentId,
          metadata: loserResult.breakdown as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    this.logger.log(
      `ZScore applied for match ${matchId}: winner ${winnerP.player.id} ${winnerResult.delta >= 0 ? '+' : ''}${winnerResult.delta}, loser ${loserP.player.id} ${loserResult.delta}`,
    );
  }

  listEventsForPlayer(playerId: string, pagination: { limit: number; offset: number }) {
    return this.events.listForPlayer(playerId, pagination);
  }
}
