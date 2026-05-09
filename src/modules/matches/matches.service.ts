import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  MatchStatus,
  Modality,
  RegistrationStatus,
  TournamentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizersRepository } from '../organizers/organizers.repository';
import { TournamentRegistrationsRepository } from '../tournament-registrations/tournament-registrations.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { ZScoreService } from '../zscore/zscore.service';
import { ReportMatchDto } from './dto/report-match.dto';
import { MatchWithParticipants, MatchesRepository } from './matches.repository';
import {
  bracketPosition,
  isPowerOfTwo,
  nextRoundPosition,
  parseBracketPosition,
  shuffle,
  siblingMatchIndex,
} from './matches.utils';

const MIN_PARTICIPANTS = 2;

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly matches: MatchesRepository,
    private readonly tournaments: TournamentsRepository,
    private readonly registrations: TournamentRegistrationsRepository,
    private readonly organizers: OrganizersRepository,
    private readonly zscore: ZScoreService,
    private readonly prisma: PrismaService,
  ) {}

  // -----------------------------
  // Bracket generation
  // -----------------------------

  async startTournament(userId: string, tournamentId: string): Promise<MatchWithParticipants[]> {
    const tournament = await this.tournaments.findById(tournamentId);
    if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    await this.assertOwnership(userId, tournament.organizerId);

    if (tournament.status !== TournamentStatus.PUBLISHED) {
      throw new ConflictException(
        `Only PUBLISHED tournaments can be started (current: ${tournament.status})`,
      );
    }

    const alreadyHasMatches = await this.matches.countByTournamentId(tournamentId);
    if (alreadyHasMatches > 0) {
      throw new ConflictException('Tournament already has matches generated');
    }

    const { items: regs } = await this.registrations.listByTournament(tournamentId, {
      limit: 1024,
      offset: 0,
    });
    const checkedIn = regs.filter((r) => r.status === RegistrationStatus.CHECKED_IN);

    if (checkedIn.length < MIN_PARTICIPANTS) {
      throw new PreconditionFailedException(
        `At least ${MIN_PARTICIPANTS} CHECKED_IN registrations required (got ${checkedIn.length})`,
      );
    }

    if (!isPowerOfTwo(checkedIn.length)) {
      throw new PreconditionFailedException(
        `Number of checked-in registrations (${checkedIn.length}) must be a power of two for SINGLE_ELIM brackets in MVP`,
      );
    }

    // Random seeding for MVP. ZScore-based seeding will replace this later.
    const seeded = shuffle(checkedIn);
    const isTeamModality = tournament.modality === Modality.TEAM_5V5;

    const created: MatchWithParticipants[] = [];
    for (let i = 0; i < seeded.length; i += 2) {
      const matchIndex = i / 2 + 1;
      const blue = seeded[i];
      const red = seeded[i + 1];

      const bluePlayerId = await this.resolveAnchorPlayerId(blue, isTeamModality);
      const redPlayerId = await this.resolveAnchorPlayerId(red, isTeamModality);

      const match = await this.matches.createWithParticipants({
        tournamentId,
        round: 1,
        bracketPosition: bracketPosition(1, matchIndex),
        scheduledAt: tournament.startsAt,
        bluePlayerId,
        redPlayerId,
      });
      created.push(match);
    }

    await this.tournaments.update(tournamentId, { status: TournamentStatus.IN_PROGRESS });

    this.logger.log(
      `Tournament ${tournamentId} started with ${created.length} round-1 matches`,
    );
    return created;
  }

  // -----------------------------
  // Match queries
  // -----------------------------

  async getById(id: string): Promise<MatchWithParticipants> {
    const match = await this.matches.findById(id);
    if (!match) throw new NotFoundException(`Match ${id} not found`);
    return match;
  }

  listForTournament(tournamentId: string): Promise<MatchWithParticipants[]> {
    return this.matches.findByTournamentId(tournamentId);
  }

  // -----------------------------
  // Match reporting
  // -----------------------------

  async report(
    userId: string,
    matchId: string,
    dto: ReportMatchDto,
  ): Promise<MatchWithParticipants> {
    const match = await this.getById(matchId);
    const tournament = await this.tournaments.findById(match.tournamentId);
    if (!tournament) throw new NotFoundException('Tournament not found');

    await this.assertOwnership(userId, tournament.organizerId);

    if (
      match.status === MatchStatus.COMPLETED ||
      match.status === MatchStatus.CANCELLED ||
      match.status === MatchStatus.DISPUTED
    ) {
      throw new ConflictException(`Cannot report a ${match.status} match`);
    }

    const winnerParticipant = match.participants.find((p) => p.side === dto.winnerSide);
    if (!winnerParticipant) {
      throw new BadRequestException(`No participant on side ${dto.winnerSide}`);
    }
    const loserParticipant = match.participants.find((p) => p.side !== dto.winnerSide);
    if (!loserParticipant) {
      throw new BadRequestException('Match is missing a side');
    }

    await this.matches.setParticipantWin(matchId, winnerParticipant.side, true);
    await this.matches.setParticipantWin(matchId, loserParticipant.side, false);

    const updated = await this.matches.update(matchId, {
      status: MatchStatus.COMPLETED,
      winnerSide: dto.winnerSide,
      finishedAt: new Date(),
    });

    await this.zscore.applyMatchResult(matchId);
    await this.advanceBracket(match, winnerParticipant.playerId, tournament.startsAt);
    return this.matches.findById(matchId).then((m) => m ?? updated);
  }

  // -----------------------------
  // Bracket advancement
  // -----------------------------

  private async advanceBracket(
    completed: MatchWithParticipants,
    winnerPlayerId: string,
    scheduledAt: Date,
  ): Promise<void> {
    const { round, match: matchIndex } = parseBracketPosition(completed.bracketPosition);
    const siblingIdx = siblingMatchIndex(matchIndex);
    const sibling = await this.matches.findByPosition(
      completed.tournamentId,
      bracketPosition(round, siblingIdx),
    );

    if (!sibling) {
      // Final reached — no sibling to wait for.
      await this.tournaments.update(completed.tournamentId, {
        status: TournamentStatus.COMPLETED,
        endsAt: new Date(),
      });
      this.logger.log(
        `Tournament ${completed.tournamentId} COMPLETED — final result recorded`,
      );
      return;
    }

    if (sibling.status !== MatchStatus.COMPLETED) {
      // Wait for sibling to finish.
      return;
    }

    const siblingWinner = sibling.participants.find((p) => p.win === true);
    if (!siblingWinner) return; // shouldn't happen for COMPLETED siblings

    const nextPos = nextRoundPosition(round, matchIndex);
    const exists = await this.matches.findByPosition(completed.tournamentId, nextPos);
    if (exists) return; // already created via the other sibling completing first

    // Even matchIndex slot in next round goes RED, odd goes BLUE — keep determinism
    const lowerIdx = Math.min(matchIndex, siblingIdx);
    const higherIdx = Math.max(matchIndex, siblingIdx);
    const lowerWinner =
      matchIndex === lowerIdx
        ? winnerPlayerId
        : siblingWinner.playerId;
    const higherWinner =
      matchIndex === higherIdx
        ? winnerPlayerId
        : siblingWinner.playerId;

    await this.matches.createWithParticipants({
      tournamentId: completed.tournamentId,
      round: round + 1,
      bracketPosition: nextPos,
      scheduledAt,
      bluePlayerId: lowerWinner,
      redPlayerId: higherWinner,
    });

    this.logger.log(`Created next-round match ${nextPos} for tournament ${completed.tournamentId}`);
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private async assertOwnership(userId: string, organizerId: string): Promise<void> {
    const organizer = await this.organizers.findByUserId(userId);
    if (!organizer || organizer.id !== organizerId) {
      throw new ForbiddenException('You do not own this tournament');
    }
  }

  /**
   * Pick the playerId we use to "anchor" a registration to a MatchParticipant row.
   * - SOLO modality: the registered player.
   * - TEAM modality: the team captain (representing the team in the match row).
   *   Per-player stats for 5v5 will be filled by the Riot Match-V5 webhook later.
   */
  private async resolveAnchorPlayerId(
    registration: { playerId: string | null; teamId: string | null },
    isTeamModality: boolean,
  ): Promise<string> {
    if (!isTeamModality) {
      if (!registration.playerId) {
        throw new BadRequestException('Solo registration is missing playerId');
      }
      return registration.playerId;
    }

    if (!registration.teamId) {
      throw new BadRequestException('Team registration is missing teamId');
    }

    const captain = await this.prisma.teamMember.findFirst({
      where: { teamId: registration.teamId, isCaptain: true, leftAt: null },
    });
    if (!captain) throw new BadRequestException('Team has no active captain');
    return captain.playerId;
  }
}
