import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Player, TeamMember, TeamRole } from '@prisma/client';
import { PlayersRepository } from '../players/players.repository';
import { TeamsRepository, TeamWithMembers } from './teams.repository';
import { TeamsService } from './teams.service';

const buildPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'player_1',
  userId: 'user_1',
  primaryRole: null,
  secondaryRole: null,
  country: 'MX',
  city: null,
  birthDate: null,
  zScore: 1500,
  zScoreVolatility: 0.06,
  zScoreDeviation: 350,
  tier: 'AMATEUR',
  isPro: false,
  proExpiresAt: null,
  recruitable: true,
  recruitablePrefs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildCaptainMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member_1',
  teamId: 'team_1',
  playerId: 'player_1',
  role: TeamRole.STARTER,
  isCaptain: true,
  joinedAt: new Date(),
  leftAt: null,
  ...overrides,
});

describe('TeamsService', () => {
  let service: TeamsService;
  let teams: jest.Mocked<TeamsRepository>;
  let players: jest.Mocked<PlayersRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: TeamsRepository,
          useValue: {
            findById: jest.fn(),
            findByTag: jest.fn(),
            createWithCaptain: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findMember: jest.fn(),
            findCaptain: jest.fn(),
            addMember: jest.fn(),
            updateMember: jest.fn(),
            removeMember: jest.fn(),
            transferCaptain: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: PlayersRepository,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TeamsService);
    teams = moduleRef.get(TeamsRepository);
    players = moduleRef.get(PlayersRepository);
  });

  describe('create', () => {
    it('rejects when user has no player profile', async () => {
      players.findByUserId.mockResolvedValue(null);

      await expect(
        service.create('user_1', { name: 'Quetzal', tag: 'QTZ', country: 'MX' }),
      ).rejects.toBeInstanceOf(PreconditionFailedException);
    });

    it('rejects when tag already taken', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer() as never);
      teams.findByTag.mockResolvedValue({
        id: 't_other',
        name: 'Other',
        tag: 'QTZ',
        country: 'MX',
        logoUrl: null,
        createdAt: new Date(),
      });

      await expect(
        service.create('user_1', { name: 'Quetzal', tag: 'QTZ', country: 'MX' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('uppercases the tag and creates the team with captain', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer() as never);
      teams.findByTag.mockResolvedValue(null);
      teams.createWithCaptain.mockResolvedValue({
        id: 'team_1',
        name: 'Quetzal',
        tag: 'QTZ',
        country: 'MX',
        logoUrl: null,
        createdAt: new Date(),
        members: [],
      } as TeamWithMembers);

      await service.create('user_1', { name: 'Quetzal', tag: 'qtz', country: 'MX' });

      expect(teams.findByTag).toHaveBeenCalledWith('QTZ');
      expect(teams.createWithCaptain).toHaveBeenCalledWith(
        expect.objectContaining({ tag: 'QTZ', captainPlayerId: 'player_1' }),
      );
    });
  });

  describe('addMember', () => {
    it('rejects non-captains', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer({ id: 'player_other' }) as never);
      teams.findCaptain.mockResolvedValue(buildCaptainMember());

      await expect(
        service.addMember('user_1', 'team_1', { playerId: 'player_2', role: TeamRole.STARTER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when target player does not exist', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer() as never);
      teams.findCaptain.mockResolvedValue(buildCaptainMember());
      players.findById.mockResolvedValue(null);

      await expect(
        service.addMember('user_1', 'team_1', { playerId: 'ghost', role: TeamRole.STARTER }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects duplicate active member', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer() as never);
      teams.findCaptain.mockResolvedValue(buildCaptainMember());
      players.findById.mockResolvedValue(buildPlayer({ id: 'player_2' }) as never);
      teams.findMember.mockResolvedValue({
        ...buildCaptainMember(),
        id: 'member_2',
        playerId: 'player_2',
        isCaptain: false,
      });

      await expect(
        service.addMember('user_1', 'team_1', { playerId: 'player_2', role: TeamRole.STARTER }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('adds the member when checks pass', async () => {
      players.findByUserId.mockResolvedValue(buildPlayer() as never);
      teams.findCaptain.mockResolvedValue(buildCaptainMember());
      players.findById.mockResolvedValue(buildPlayer({ id: 'player_2' }) as never);
      teams.findMember.mockResolvedValue(null);
      teams.addMember.mockResolvedValue({
        ...buildCaptainMember(),
        id: 'member_new',
        playerId: 'player_2',
        isCaptain: false,
      });

      const result = await service.addMember('user_1', 'team_1', {
        playerId: 'player_2',
        role: TeamRole.SUBSTITUTE,
      });

      expect(teams.addMember).toHaveBeenCalledWith({
        teamId: 'team_1',
        playerId: 'player_2',
        role: TeamRole.SUBSTITUTE,
      });
      expect(result.playerId).toBe('player_2');
    });
  });
});
