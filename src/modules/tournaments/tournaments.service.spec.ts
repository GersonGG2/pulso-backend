import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BracketType, Modality, TournamentFormat, TournamentStatus } from '@prisma/client';
import { OrganizerWithUser, OrganizersRepository } from '../organizers/organizers.repository';
import { TournamentWithOrganizer, TournamentsRepository } from './tournaments.repository';
import { TournamentsService } from './tournaments.service';

const buildOrganizer = (overrides: Partial<OrganizerWithUser> = {}): OrganizerWithUser => ({
  id: 'org_1',
  userId: 'user_1',
  organizationName: 'Liga',
  contactEmail: 'a@b.com',
  contactPhone: null,
  rfc: null,
  website: null,
  verified: true,
  verifiedAt: new Date(),
  verifiedBy: null,
  payoutMethodEncrypted: null,
  createdAt: new Date(),
  user: { id: 'user_1', username: 'gerson', displayName: 'G', avatarUrl: null },
  ...overrides,
});

const validDto = () => ({
  name: 'Pulso Cup MX Mayo 2026',
  description: 'Torneo abierto LoL 5v5 LAN. Bo3 hasta finales.',
  format: TournamentFormat.SINGLE_ELIM,
  modality: Modality.TEAM_5V5,
  bracketType: BracketType.SEEDED,
  region: 'MX',
  maxParticipants: 32,
  entryFeeMxnCents: 0,
  registrationOpensAt: new Date('2027-06-01T00:00:00Z'),
  registrationClosesAt: new Date('2027-06-10T00:00:00Z'),
  startsAt: new Date('2027-06-15T18:00:00Z'),
  rulesetVersion: '1.0.0',
});

describe('TournamentsService', () => {
  let service: TournamentsService;
  let repo: jest.Mocked<TournamentsRepository>;
  let orgs: jest.Mocked<OrganizersRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: TournamentsRepository,
          useValue: {
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn().mockResolvedValue(false),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: OrganizersRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(TournamentsService);
    repo = moduleRef.get(TournamentsRepository);
    orgs = moduleRef.get(OrganizersRepository);
  });

  describe('create', () => {
    it('rejects when user has no organizer profile', async () => {
      orgs.findByUserId.mockResolvedValue(null);

      await expect(service.create('user_1', validDto())).rejects.toBeInstanceOf(
        PreconditionFailedException,
      );
    });

    it('rejects unverified organizers', async () => {
      orgs.findByUserId.mockResolvedValue(buildOrganizer({ verified: false }));

      await expect(service.create('user_1', validDto())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejects bad date order (closes before opens)', async () => {
      orgs.findByUserId.mockResolvedValue(buildOrganizer());

      await expect(
        service.create('user_1', {
          ...validDto(),
          registrationOpensAt: new Date('2027-06-10T00:00:00Z'),
          registrationClosesAt: new Date('2027-06-01T00:00:00Z'),
          startsAt: new Date('2027-06-15T00:00:00Z'),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates tournament with derived slug', async () => {
      orgs.findByUserId.mockResolvedValue(buildOrganizer());
      repo.create.mockResolvedValue({} as TournamentWithOrganizer);

      await service.create('user_1', validDto());

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: expect.stringMatching(/^pulso-cup-mx-mayo-2026/),
          status: TournamentStatus.DRAFT,
        }),
      );
    });
  });

  describe('publish', () => {
    it('rejects non-DRAFT publish', async () => {
      const t = {
        id: 't1',
        organizerId: 'org_1',
        status: TournamentStatus.PUBLISHED,
      } as unknown as TournamentWithOrganizer;
      repo.findById.mockResolvedValue(t);
      orgs.findByUserId.mockResolvedValue(buildOrganizer());

      await expect(service.publish('user_1', 't1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects non-owner publish', async () => {
      const t = {
        id: 't1',
        organizerId: 'org_other',
        status: TournamentStatus.DRAFT,
      } as unknown as TournamentWithOrganizer;
      repo.findById.mockResolvedValue(t);
      orgs.findByUserId.mockResolvedValue(buildOrganizer());

      await expect(service.publish('user_1', 't1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
