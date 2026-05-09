import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  Modality,
  PlayerTier,
  RegistrationStatus,
  TeamRole,
  TournamentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayersRepository } from '../players/players.repository';
import { TeamsRepository } from '../teams/teams.repository';
import { TournamentsRepository } from '../tournaments/tournaments.repository';
import { TournamentRegistrationsRepository } from './tournament-registrations.repository';
import { TournamentRegistrationsService } from './tournament-registrations.service';

const buildSoloTournament = (overrides: Partial<{ minTier: PlayerTier | null; maxTier: PlayerTier | null }> = {}) => ({
  id: 't1',
  modality: Modality.SOLO_1V1,
  status: TournamentStatus.PUBLISHED,
  registrationOpensAt: new Date(Date.now() - 60_000),
  registrationClosesAt: new Date(Date.now() + 60_000),
  maxParticipants: 16,
  entryFeeMxnCents: 0,
  minTier: null,
  maxTier: null,
  ...overrides,
});

describe('TournamentRegistrationsService', () => {
  let service: TournamentRegistrationsService;
  let regs: jest.Mocked<TournamentRegistrationsRepository>;
  let tournaments: jest.Mocked<TournamentsRepository>;
  let players: jest.Mocked<PlayersRepository>;
  let teams: jest.Mocked<TeamsRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TournamentRegistrationsService,
        {
          provide: TournamentRegistrationsRepository,
          useValue: {
            findById: jest.fn(),
            findActiveForPlayer: jest.fn(),
            findActiveForTeam: jest.fn(),
            countActive: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            listByTournament: jest.fn(),
          },
        },
        {
          provide: TournamentsRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: PlayersRepository,
          useValue: { findByUserId: jest.fn(), findById: jest.fn() },
        },
        {
          provide: TeamsRepository,
          useValue: { findCaptain: jest.fn(), findById: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { teamMember: { findFirst: jest.fn() } },
        },
      ],
    }).compile();

    service = moduleRef.get(TournamentRegistrationsService);
    regs = moduleRef.get(TournamentRegistrationsRepository);
    tournaments = moduleRef.get(TournamentsRepository);
    players = moduleRef.get(PlayersRepository);
    teams = moduleRef.get(TeamsRepository);
  });

  describe('create — solo', () => {
    it('rejects when tournament not found', async () => {
      tournaments.findById.mockResolvedValue(null);

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when tournament is not PUBLISHED', async () => {
      tournaments.findById.mockResolvedValue(
        { ...buildSoloTournament(), status: TournamentStatus.DRAFT } as never,
      );

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when tournament is full', async () => {
      tournaments.findById.mockResolvedValue(buildSoloTournament() as never);
      regs.countActive.mockResolvedValue(16);

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects player below minTier', async () => {
      tournaments.findById.mockResolvedValue(
        buildSoloTournament({ minTier: PlayerTier.SEMI_PRO }) as never,
      );
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1', tier: PlayerTier.AMATEUR } as never);

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects double registration for same player', async () => {
      tournaments.findById.mockResolvedValue(buildSoloTournament() as never);
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1', tier: PlayerTier.AMATEUR } as never);
      regs.findActiveForPlayer.mockResolvedValue({ id: 'r1' } as never);

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates with CONFIRMED when entry fee is 0', async () => {
      tournaments.findById.mockResolvedValue(buildSoloTournament() as never);
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1', tier: PlayerTier.AMATEUR } as never);
      regs.findActiveForPlayer.mockResolvedValue(null);
      regs.create.mockResolvedValue({} as never);

      await service.create('user_1', 't1', {});

      expect(regs.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: RegistrationStatus.CONFIRMED }),
      );
    });

    it('creates with PENDING_PAYMENT when entry fee > 0', async () => {
      tournaments.findById.mockResolvedValue(
        { ...buildSoloTournament(), entryFeeMxnCents: 5000 } as never,
      );
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1', tier: PlayerTier.AMATEUR } as never);
      regs.findActiveForPlayer.mockResolvedValue(null);
      regs.create.mockResolvedValue({} as never);

      await service.create('user_1', 't1', {});

      expect(regs.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: RegistrationStatus.PENDING_PAYMENT }),
      );
    });
  });

  describe('create — team', () => {
    it('rejects when teamId missing for team modality', async () => {
      tournaments.findById.mockResolvedValue({
        ...buildSoloTournament(),
        modality: Modality.TEAM_5V5,
      } as never);
      regs.countActive.mockResolvedValue(0);

      await expect(service.create('user_1', 't1', {})).rejects.toBeInstanceOf(
        // class-transformer would 400 for missing field, but here we test the service throws
        Error,
      );
    });

    it('rejects when user is not the captain', async () => {
      tournaments.findById.mockResolvedValue({
        ...buildSoloTournament(),
        modality: Modality.TEAM_5V5,
      } as never);
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1' } as never);
      teams.findCaptain.mockResolvedValue({ playerId: 'p_other' } as never);

      await expect(
        service.create('user_1', 't1', { teamId: 'team_1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when team has fewer than 5 active starters', async () => {
      tournaments.findById.mockResolvedValue({
        ...buildSoloTournament(),
        modality: Modality.TEAM_5V5,
      } as never);
      regs.countActive.mockResolvedValue(0);
      players.findByUserId.mockResolvedValue({ id: 'p1' } as never);
      teams.findCaptain.mockResolvedValue({ playerId: 'p1' } as never);
      teams.findById.mockResolvedValue({
        members: [
          { role: TeamRole.STARTER, leftAt: null },
          { role: TeamRole.STARTER, leftAt: null },
          { role: TeamRole.SUBSTITUTE, leftAt: null },
        ],
      } as never);

      await expect(
        service.create('user_1', 't1', { teamId: 'team_1' }),
      ).rejects.toBeInstanceOf(Error);
    });
  });
});
