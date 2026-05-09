import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OrganizerWithUser, OrganizersRepository } from './organizers.repository';
import { OrganizersService } from './organizers.service';

const buildOrganizer = (overrides: Partial<OrganizerWithUser> = {}): OrganizerWithUser => ({
  id: 'org_1',
  userId: 'user_1',
  organizationName: 'Liga Pulso CDMX',
  contactEmail: 'a@b.com',
  contactPhone: null,
  rfc: null,
  website: null,
  verified: true,
  verifiedAt: new Date(),
  verifiedBy: null,
  payoutMethodEncrypted: null,
  createdAt: new Date(),
  user: {
    id: 'user_1',
    username: 'gerson',
    displayName: 'Gerson',
    avatarUrl: null,
  },
  ...overrides,
});

describe('OrganizersService', () => {
  let service: OrganizersService;
  let repo: jest.Mocked<OrganizersRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizersService,
        {
          provide: OrganizersRepository,
          useValue: {
            findById: jest.fn(),
            findByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            list: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(OrganizersService);
    repo = moduleRef.get(OrganizersRepository);
  });

  it('rejects double apply', async () => {
    repo.findByUserId.mockResolvedValue(buildOrganizer());

    await expect(
      service.apply('user_1', { organizationName: 'X', contactEmail: 'a@b.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('auto-verifies on first apply', async () => {
    repo.findByUserId.mockResolvedValue(null);
    repo.create.mockResolvedValue(buildOrganizer());

    await service.apply('user_1', {
      organizationName: 'Liga Pulso',
      contactEmail: 'a@b.com',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true, verifiedAt: expect.any(Date) }),
    );
  });

  it('throws when fetching unknown organizer by user', async () => {
    repo.findByUserId.mockResolvedValue(null);

    await expect(service.getByUserId('ghost')).rejects.toBeInstanceOf(NotFoundException);
  });
});
