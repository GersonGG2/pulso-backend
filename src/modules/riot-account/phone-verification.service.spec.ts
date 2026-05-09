import {
  BadRequestException,
  ConflictException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RiotAccount } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneVerificationService } from './phone-verification.service';
import { RiotAccountRepository } from './riot-account.repository';
import { TwilioVerifyService } from './twilio-verify.service';

const buildAccount = (overrides: Partial<RiotAccount> = {}): RiotAccount => ({
  id: 'clx_riot_1',
  userId: 'user_1',
  puuid: 'puuid_xyz',
  summonerId: 'summ_xyz',
  region: 'LAN',
  gameName: 'Faker',
  tagLine: 'KR1',
  summonerLevel: 312,
  highestRankEver: 'GOLD',
  currentTier: 'GOLD',
  currentRank: 'II',
  currentLP: 47,
  smsVerified: false,
  smsVerifiedAt: null,
  phoneNumber: null,
  linkedAt: new Date(),
  lastSyncedAt: new Date(),
  ...overrides,
});

describe('PhoneVerificationService', () => {
  let service: PhoneVerificationService;
  let accounts: jest.Mocked<RiotAccountRepository>;
  let twilio: jest.Mocked<TwilioVerifyService>;
  let prisma: { riotAccount: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = { riotAccount: { findFirst: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PhoneVerificationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RiotAccountRepository,
          useValue: {
            findByUserId: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: TwilioVerifyService,
          useValue: {
            send: jest.fn(),
            check: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PhoneVerificationService);
    accounts = moduleRef.get(RiotAccountRepository);
    twilio = moduleRef.get(TwilioVerifyService);
  });

  describe('sendCode', () => {
    it('rejects when user has no Riot account linked', async () => {
      accounts.findByUserId.mockResolvedValue(null);

      await expect(service.sendCode('user_1', '+525512345678')).rejects.toBeInstanceOf(
        PreconditionFailedException,
      );
    });

    it('rejects when phone already verified for the same user', async () => {
      accounts.findByUserId.mockResolvedValue(
        buildAccount({ smsVerified: true, phoneNumber: '+525512345678' }),
      );

      await expect(service.sendCode('user_1', '+525512345678')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rejects when phone is claimed by another verified account', async () => {
      accounts.findByUserId.mockResolvedValue(buildAccount());
      prisma.riotAccount.findFirst.mockResolvedValue(
        buildAccount({ userId: 'other_user', smsVerified: true, phoneNumber: '+525512345678' }),
      );

      await expect(service.sendCode('user_1', '+525512345678')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('forwards to Twilio when checks pass', async () => {
      accounts.findByUserId.mockResolvedValue(buildAccount());
      prisma.riotAccount.findFirst.mockResolvedValue(null);
      twilio.send.mockResolvedValue({ status: 'pending', devCode: '123456' });

      const result = await service.sendCode('user_1', '+525512345678');

      expect(twilio.send).toHaveBeenCalledWith('+525512345678');
      expect(result.status).toBe('pending');
    });
  });

  describe('verifyCode', () => {
    it('rejects when user has no Riot account', async () => {
      accounts.findByUserId.mockResolvedValue(null);

      await expect(
        service.verifyCode('user_1', '+525512345678', '123456'),
      ).rejects.toBeInstanceOf(PreconditionFailedException);
    });

    it('rejects when Twilio denies the code', async () => {
      accounts.findByUserId.mockResolvedValue(buildAccount());
      twilio.check.mockResolvedValue({ approved: false, status: 'pending' });

      await expect(
        service.verifyCode('user_1', '+525512345678', 'wrong'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(accounts.upsert).not.toHaveBeenCalled();
    });

    it('persists phone and smsVerified=true on approved code', async () => {
      accounts.findByUserId.mockResolvedValue(buildAccount());
      twilio.check.mockResolvedValue({ approved: true, status: 'approved' });
      accounts.upsert.mockResolvedValue(
        buildAccount({ smsVerified: true, phoneNumber: '+525512345678' }),
      );

      const result = await service.verifyCode('user_1', '+525512345678', '123456');

      expect(accounts.upsert).toHaveBeenCalledWith(
        'user_1',
        expect.anything(),
        expect.objectContaining({
          phoneNumber: '+525512345678',
          smsVerified: true,
        }),
      );
      expect(result).toEqual({ verified: true });
    });
  });
});
