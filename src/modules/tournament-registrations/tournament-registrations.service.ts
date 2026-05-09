import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Modality,
  PlayerTier,
  RegistrationStatus,
  TeamRole,
  TournamentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayersRepository } from '../players/players.repository';
import { TIER_RANK } from '../players/players.utils';
import { TeamsRepository } from '../teams/teams.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import {
  RegistrationWithRelations,
  TournamentRegistrationsRepository,
} from './tournament-registrations.repository';

const STARTING_LINEUP_SIZE = 5;

@Injectable()
export class TournamentRegistrationsService {
  private readonly logger = new Logger(TournamentRegistrationsService.name);

  constructor(
    private readonly registrations: TournamentRegistrationsRepository,
    private readonly tournaments: TournamentsRepository,
    private readonly players: PlayersRepository,
    private readonly teams: TeamsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    userId: string,
    tournamentId: string,
    dto: CreateRegistrationDto,
  ): Promise<RegistrationWithRelations> {
    const tournament = await this.tournaments.findById(tournamentId);
    if (!tournament) throw new NotFoundException(`Tournament ${tournamentId} not found`);

    this.assertRegistrationWindow(tournament);

    const capacityUsed = await this.registrations.countActive(tournamentId);
    if (capacityUsed >= tournament.maxParticipants) {
      throw new ConflictException('Tournament is full');
    }

    const isTeamModality = tournament.modality === Modality.TEAM_5V5;
    const initialStatus =
      tournament.entryFeeMxnCents > 0
        ? RegistrationStatus.PENDING_PAYMENT
        : RegistrationStatus.CONFIRMED;

    if (isTeamModality) {
      return this.registerTeam(userId, tournament.id, dto, initialStatus);
    }
    return this.registerSolo(userId, tournament, initialStatus);
  }

  async withdraw(userId: string, tournamentId: string, registrationId: string): Promise<void> {
    const reg = await this.registrations.findById(registrationId);
    if (!reg || reg.tournamentId !== tournamentId) {
      throw new NotFoundException('Registration not found in this tournament');
    }

    await this.assertOwnership(userId, reg);

    if (
      reg.status === RegistrationStatus.WITHDRAWN ||
      reg.status === RegistrationStatus.DISQUALIFIED
    ) {
      throw new ConflictException(`Already ${reg.status.toLowerCase()}`);
    }

    const tournament = await this.tournaments.findById(tournamentId);
    if (
      tournament &&
      tournament.status !== TournamentStatus.PUBLISHED &&
      tournament.status !== TournamentStatus.DRAFT
    ) {
      throw new ConflictException('Cannot withdraw after tournament has started');
    }

    await this.registrations.update(registrationId, {
      status: RegistrationStatus.WITHDRAWN,
    });
  }

  async checkIn(userId: string, tournamentId: string, registrationId: string) {
    const reg = await this.registrations.findById(registrationId);
    if (!reg || reg.tournamentId !== tournamentId) {
      throw new NotFoundException('Registration not found in this tournament');
    }

    await this.assertOwnership(userId, reg);

    if (reg.status === RegistrationStatus.CHECKED_IN) {
      throw new ConflictException('Already checked in');
    }
    if (reg.status !== RegistrationStatus.CONFIRMED) {
      throw new ConflictException(
        `Can only check in from CONFIRMED status (current: ${reg.status})`,
      );
    }

    return this.registrations.update(registrationId, {
      status: RegistrationStatus.CHECKED_IN,
      checkedInAt: new Date(),
    });
  }

  async getMine(
    userId: string,
    tournamentId: string,
  ): Promise<RegistrationWithRelations | null> {
    const player = await this.players.findByUserId(userId);
    if (!player) return null;

    const playerReg = await this.registrations.findActiveForPlayer(tournamentId, player.id);
    if (playerReg) return this.registrations.findById(playerReg.id);

    // Check team registrations where user is captain
    const teamMember = await this.prisma.teamMember.findFirst({
      where: { playerId: player.id, isCaptain: true, leftAt: null },
    });
    if (!teamMember) return null;

    const teamReg = await this.registrations.findActiveForTeam(tournamentId, teamMember.teamId);
    if (!teamReg) return null;

    return this.registrations.findById(teamReg.id);
  }

  list(tournamentId: string, pagination: { limit: number; offset: number }) {
    return this.registrations.listByTournament(tournamentId, pagination);
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------

  private async registerSolo(
    userId: string,
    tournament: { id: string; minTier: PlayerTier | null; maxTier: PlayerTier | null },
    status: RegistrationStatus,
  ): Promise<RegistrationWithRelations> {
    const player = await this.players.findByUserId(userId);
    if (!player) {
      throw new BadRequestException('Solo registration requires a player profile');
    }

    this.assertTierEligibility(player.tier, tournament.minTier, tournament.maxTier);

    const existing = await this.registrations.findActiveForPlayer(tournament.id, player.id);
    if (existing) throw new ConflictException('You are already registered');

    return this.registrations.create({
      tournament: { connect: { id: tournament.id } },
      player: { connect: { id: player.id } },
      status,
    });
  }

  private async registerTeam(
    userId: string,
    tournamentId: string,
    dto: CreateRegistrationDto,
    status: RegistrationStatus,
  ): Promise<RegistrationWithRelations> {
    if (!dto.teamId) {
      throw new BadRequestException('teamId is required for TEAM_5V5 modality');
    }

    const player = await this.players.findByUserId(userId);
    if (!player) throw new BadRequestException('You need a player profile');

    const captain = await this.teams.findCaptain(dto.teamId);
    if (!captain || captain.playerId !== player.id) {
      throw new ForbiddenException('Only the team captain can register the team');
    }

    const team = await this.teams.findById(dto.teamId);
    if (!team) throw new NotFoundException(`Team ${dto.teamId} not found`);

    const starters = team.members.filter(
      (m) => !m.leftAt && m.role === TeamRole.STARTER,
    ).length;
    if (starters < STARTING_LINEUP_SIZE) {
      throw new BadRequestException(
        `Team needs at least ${STARTING_LINEUP_SIZE} active starters (current: ${starters})`,
      );
    }

    const existing = await this.registrations.findActiveForTeam(tournamentId, dto.teamId);
    if (existing) throw new ConflictException('Team is already registered');

    return this.registrations.create({
      tournament: { connect: { id: tournamentId } },
      team: { connect: { id: dto.teamId } },
      status,
    });
  }

  private assertRegistrationWindow(tournament: {
    status: TournamentStatus;
    registrationOpensAt: Date;
    registrationClosesAt: Date;
  }) {
    if (tournament.status !== TournamentStatus.PUBLISHED) {
      throw new ConflictException(
        `Registrations are only open while tournament is PUBLISHED (current: ${tournament.status})`,
      );
    }
    const now = Date.now();
    if (now < tournament.registrationOpensAt.getTime()) {
      throw new ConflictException('Registrations have not opened yet');
    }
    if (now >= tournament.registrationClosesAt.getTime()) {
      throw new ConflictException('Registrations are closed');
    }
  }

  private assertTierEligibility(
    playerTier: PlayerTier,
    minTier: PlayerTier | null,
    maxTier: PlayerTier | null,
  ) {
    const playerRank = TIER_RANK[playerTier];
    if (minTier && playerRank < TIER_RANK[minTier]) {
      throw new ForbiddenException(`Tier too low: requires ≥ ${minTier}`);
    }
    if (maxTier && playerRank > TIER_RANK[maxTier]) {
      throw new ForbiddenException(`Tier too high: requires ≤ ${maxTier}`);
    }
  }

  private async assertOwnership(
    userId: string,
    reg: RegistrationWithRelations,
  ): Promise<void> {
    const player = await this.players.findByUserId(userId);
    if (!player) throw new ForbiddenException('No player profile');

    if (reg.player) {
      if (reg.player.id !== player.id) {
        throw new ForbiddenException('Not your registration');
      }
      return;
    }

    if (reg.team) {
      const captain = await this.teams.findCaptain(reg.team.id);
      if (!captain || captain.playerId !== player.id) {
        throw new ForbiddenException('Only the team captain can manage this registration');
      }
    }
  }
}
