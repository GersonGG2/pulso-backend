import {
  ConflictException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LolRole, Player, PlayerTier, RiotAccount } from '@prisma/client';
import { RiotAccountRepository } from '../riot-account/riot-account.repository';
import { PlayersRepository, PlayerWithRelations } from './players.repository';
import { PlayersService } from './players.service';

const buildPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'clx_player_1',
  userId: 'user_1',
  primaryRole: LolRole.MID,
  secondaryRole: null,
  country: 'MX',
  city: null,
  birthDate: null,
  zScore: 1500,
  zScoreVolatility: 0.06,
  zScoreDeviation: 350,
  tier: PlayerTier.AMATEUR,
  isPro: false,
  proExpiresAt: null,
  recruitable: true,
  recruitablePrefs: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const buildPlayerWithRelations = (
  overrides: Partial<Player> = {},
): PlayerWithRelations => ({
  ...buildPlayer(overrides),
  user: {
    id: 'user_1',
    username: 'gerson',
    displayName: 'Gerson',
    avatarUrl: null,
    riotAccount: null,
  },
});

const buildRiotAccount = (): RiotAccount => ({
  id: 'clx_riot_1',
  userId: 'user_1',
  puuid: 'puuid_xyz',
  summonerId: null,
  region: 'LAN',
  gameName: 'yerzong',
  tagLine: 'gygg',
  summonerLevel: 29,
  highestRankEver: null,
  currentTier: null,
  currentRank: null,
  currentLP: null,
  smsVerified: false,
  smsVerifiedAt: null,
  phoneNumber: null,
  linkedAt: new Date(),
  lastSyncedAt: new Date(),
});

describe('PlayersService', () => {
  let service: PlayersService;
  let players: jest.Mocked<PlayersRepository>;
  let riotAccounts: jest.Mocked<RiotAccountRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: PlayersRepository,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: RiotAccountRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PlayersService);
    players = moduleRef.get(PlayersRepository);
    riotAccounts = moduleRef.get(RiotAccountRepository);
  });

  describe('createForUser', () => {
    it('rejects when user already has a player profile', async () => {
      players.findByUserId.mockResolvedValue(buildPlayerWithRelations());

      await expect(service.createForUser('user_1', { country: 'MX' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when user has no Riot account linked', async () => {
      players.findByUserId.mockResolvedValue(null);
      riotAccounts.findByUserId.mockResolvedValue(null);

      await expect(service.createForUser('user_1', { country: 'MX' })).rejects.toBeInstanceOf(
        PreconditionFailedException,
      );
      expect(players.create).not.toHaveBeenCalled();
    });

    it('creates the player when prerequisites are met', async () => {
      players.findByUserId.mockResolvedValue(null);
      riotAccounts.findByUserId.mockResolvedValue(buildRiotAccount());
      const created = buildPlayer();
      players.create.mockResolvedValue(created);

      const result = await service.createForUser('user_1', {
        country: 'MX',
        primaryRole: LolRole.MID,
      });

      expect(players.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'MX',
          primaryRole: LolRole.MID,
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('updateMine', () => {
    it('throws NotFound when player does not exist', async () => {
      players.findByUserId.mockResolvedValue(null);

      await expect(
        service.updateMine('user_1', { country: 'AR' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only the provided fields', async () => {
      players.findByUserId.mockResolvedValue(buildPlayerWithRelations());
      players.update.mockResolvedValue(
        buildPlayerWithRelations({ country: 'AR', primaryRole: LolRole.JUNGLE }),
      );

      await service.updateMine('user_1', { country: 'AR', primaryRole: LolRole.JUNGLE });

      expect(players.update).toHaveBeenCalledWith('user_1', {
        country: 'AR',
        primaryRole: LolRole.JUNGLE,
      });
    });
  });

  describe('applyZScoreDelta', () => {
    it('updates score and recomputes tier', async () => {
      players.findByUserId.mockResolvedValue(
        buildPlayerWithRelations({ zScore: 1690, tier: PlayerTier.AMATEUR }),
      );
      players.update.mockResolvedValue(
        buildPlayerWithRelations({ zScore: 1710, tier: PlayerTier.COMPETIDOR }),
      );

      await service.applyZScoreDelta('user_1', 20);

      expect(players.update).toHaveBeenCalledWith('user_1', {
        zScore: 1710,
        tier: PlayerTier.COMPETIDOR,
      });
    });
  });
});
