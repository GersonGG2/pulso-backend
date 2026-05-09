import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RiotAccount, RiotLinkAttempt } from '@prisma/client';
import { RiotAccountRepository } from './riot-account.repository';
import { RiotAccountService } from './riot-account.service';
import { RiotApiService } from './riot-api.service';

const buildAccount = (overrides: Partial<RiotAccount> = {}): RiotAccount => ({
  id: 'clx_riot_1',
  userId: 'user_1',
  puuid: 'puuid_xyz',
  summonerId: 'summ_xyz',
  region: 'LAN',
  gameName: 'Faker',
  tagLine: 'KR1',
  summonerLevel: 312,
  highestRankEver: null,
  currentTier: null,
  currentRank: null,
  currentLP: null,
  smsVerified: false,
  smsVerifiedAt: null,
  phoneNumber: null,
  linkedAt: new Date(),
  lastSyncedAt: new Date(),
  ...overrides,
});

const buildAttempt = (overrides: Partial<RiotLinkAttempt> = {}): RiotLinkAttempt => ({
  id: 'attempt_1',
  userId: 'user_1',
  puuid: 'puuid_xyz',
  summonerId: 'summ_xyz',
  gameName: 'Faker',
  tagLine: 'KR1',
  region: 'LAN',
  expectedIconId: 28,
  originalIconId: 5,
  expiresAt: new Date(Date.now() + 600_000),
  createdAt: new Date(),
  ...overrides,
});

describe('RiotAccountService', () => {
  let service: RiotAccountService;
  let repo: jest.Mocked<RiotAccountRepository>;
  let riot: jest.Mocked<RiotApiService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RiotAccountService,
        {
          provide: RiotAccountRepository,
          useValue: {
            findByUserId: jest.fn(),
            findByPuuid: jest.fn(),
            findAttemptByUserId: jest.fn(),
            upsertAttempt: jest.fn(),
            upsert: jest.fn(),
            deleteAttempt: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RiotApiService,
          useValue: {
            getAccountByRiotId: jest.fn(),
            getSummonerByPuuid: jest.fn(),
            getLeagueEntriesByPuuid: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(RiotAccountService);
    repo = moduleRef.get(RiotAccountRepository);
    riot = moduleRef.get(RiotApiService);
  });

  describe('initiateLink', () => {
    it('rejects when user already has linked account', async () => {
      repo.findByUserId.mockResolvedValue(buildAccount());

      await expect(
        service.initiateLink('user_1', { gameName: 'Faker', tagLine: 'KR1', region: 'LAN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects when Riot ID does not exist', async () => {
      repo.findByUserId.mockResolvedValue(null);
      riot.getAccountByRiotId.mockResolvedValue(null);

      await expect(
        service.initiateLink('user_1', { gameName: 'Ghost', tagLine: 'XX1', region: 'LAN' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when puuid is already claimed by another user', async () => {
      repo.findByUserId.mockResolvedValue(null);
      riot.getAccountByRiotId.mockResolvedValue({
        puuid: 'puuid_xyz',
        gameName: 'Faker',
        tagLine: 'KR1',
      });
      repo.findByPuuid.mockResolvedValue(buildAccount({ userId: 'other_user' }));

      await expect(
        service.initiateLink('user_1', { gameName: 'Faker', tagLine: 'KR1', region: 'LAN' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns expected icon and persists attempt on happy path', async () => {
      repo.findByUserId.mockResolvedValue(null);
      riot.getAccountByRiotId.mockResolvedValue({
        puuid: 'puuid_xyz',
        gameName: 'Faker',
        tagLine: 'KR1',
      });
      repo.findByPuuid.mockResolvedValue(null);
      riot.getSummonerByPuuid.mockResolvedValue({
        id: 'summ_xyz',
        accountId: 'acc_xyz',
        puuid: 'puuid_xyz',
        profileIconId: 5,
        revisionDate: 0,
        summonerLevel: 312,
      });
      repo.upsertAttempt.mockResolvedValue(buildAttempt());

      const result = await service.initiateLink('user_1', {
        gameName: 'Faker',
        tagLine: 'KR1',
        region: 'LAN',
      });

      expect(result.expectedIconId).not.toBe(5);
      expect(result.originalIconId).toBe(5);
      expect(result.riotId).toBe('Faker#KR1');
      expect(repo.upsertAttempt).toHaveBeenCalled();
    });
  });

  describe('confirmLink', () => {
    it('throws NotFound when no pending attempt', async () => {
      repo.findAttemptByUserId.mockResolvedValue(null);

      await expect(service.confirmLink('user_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Gone when attempt expired', async () => {
      repo.findAttemptByUserId.mockResolvedValue(
        buildAttempt({ expiresAt: new Date(Date.now() - 60_000) }),
      );

      await expect(service.confirmLink('user_1')).rejects.toBeInstanceOf(GoneException);
      expect(repo.deleteAttempt).toHaveBeenCalledWith('user_1');
    });

    it('throws BadRequest when icon does not match', async () => {
      repo.findAttemptByUserId.mockResolvedValue(buildAttempt());
      riot.getSummonerByPuuid.mockResolvedValue({
        id: 'summ_xyz',
        accountId: 'acc_xyz',
        puuid: 'puuid_xyz',
        profileIconId: 99, // expected 28
        revisionDate: 0,
        summonerLevel: 312,
      });

      await expect(service.confirmLink('user_1')).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.upsert).not.toHaveBeenCalled();
    });

    it('persists account, captures rank, and clears attempt on match', async () => {
      repo.findAttemptByUserId.mockResolvedValue(buildAttempt());
      riot.getSummonerByPuuid.mockResolvedValue({
        id: 'summ_xyz',
        accountId: 'acc_xyz',
        puuid: 'puuid_xyz',
        profileIconId: 28,
        revisionDate: 0,
        summonerLevel: 312,
      });
      riot.getLeagueEntriesByPuuid.mockResolvedValue([
        {
          leagueId: 'lg1',
          queueType: 'RANKED_SOLO_5x5',
          tier: 'GOLD',
          rank: 'II',
          summonerId: 'summ_xyz',
          leaguePoints: 47,
          wins: 30,
          losses: 25,
          veteran: false,
          inactive: false,
          freshBlood: false,
          hotStreak: false,
        },
        {
          leagueId: 'lg2',
          queueType: 'RANKED_FLEX_SR',
          tier: 'PLATINUM',
          rank: 'IV',
          summonerId: 'summ_xyz',
          leaguePoints: 12,
          wins: 10,
          losses: 8,
          veteran: false,
          inactive: false,
          freshBlood: false,
          hotStreak: false,
        },
      ]);
      const persisted = buildAccount({
        currentTier: 'GOLD',
        currentRank: 'II',
        currentLP: 47,
        highestRankEver: 'PLATINUM',
      });
      repo.upsert.mockResolvedValue(persisted);

      const result = await service.confirmLink('user_1');

      expect(repo.upsert).toHaveBeenCalled();
      expect(repo.deleteAttempt).toHaveBeenCalledWith('user_1');
      expect(result.currentTier).toBe('GOLD');
      expect(result.highestRankEver).toBe('PLATINUM');
    });
  });

  describe('unlink', () => {
    it('deletes when account exists', async () => {
      repo.findByUserId.mockResolvedValue(buildAccount());

      await service.unlink('user_1');

      expect(repo.delete).toHaveBeenCalledWith('user_1');
    });

    it('throws NotFound when no account linked', async () => {
      repo.findByUserId.mockResolvedValue(null);

      await expect(service.unlink('user_1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
