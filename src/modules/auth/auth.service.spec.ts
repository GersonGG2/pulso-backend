import { Test } from '@nestjs/testing';
import { User, UserRole } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';
import { ClerkUserData } from './dto/clerk-webhook.dto';

const buildClerkUser = (overrides: Partial<ClerkUserData> = {}): ClerkUserData => ({
  id: 'clerk_abc',
  email_addresses: [
    { id: 'email_1', email_address: 'gerson@pulsogg.gg' },
  ],
  primary_email_address_id: 'email_1',
  username: null,
  first_name: 'Gerson',
  last_name: 'García',
  image_url: 'https://img.clerk.com/abc',
  created_at: 0,
  updated_at: 0,
  ...overrides,
});

const buildDbUser = (overrides: Partial<User> = {}): User => ({
  id: 'user_1',
  clerkUserId: 'clerk_abc',
  email: 'gerson@pulsogg.gg',
  username: 'gerson',
  displayName: 'Gerson García',
  avatarUrl: 'https://img.clerk.com/abc',
  role: UserRole.PLAYER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByClerkId: jest.fn(),
            findByUsername: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repo = moduleRef.get(UsersRepository);
  });

  describe('syncUserFromClerk', () => {
    it('creates user when missing, deriving username from email local-part', async () => {
      repo.findByClerkId.mockResolvedValue(null);
      repo.findByUsername.mockResolvedValue(null);
      const created = buildDbUser();
      repo.create.mockResolvedValue(created);

      const result = await service.syncUserFromClerk(buildClerkUser());

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clerkUserId: 'clerk_abc',
          email: 'gerson@pulsogg.gg',
          username: 'gerson',
          displayName: 'Gerson García',
        }),
      );
      expect(result).toBe(created);
    });

    it('appends suffix when derived username is taken', async () => {
      repo.findByClerkId.mockResolvedValue(null);
      repo.findByUsername.mockResolvedValueOnce(buildDbUser()).mockResolvedValueOnce(null);
      const created = buildDbUser({ username: 'gerson_1' });
      repo.create.mockResolvedValue(created);

      await service.syncUserFromClerk(buildClerkUser());

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'gerson_1' }),
      );
    });

    it('updates existing user when fields changed', async () => {
      const existing = buildDbUser({ displayName: 'Old Name', avatarUrl: 'old.png' });
      repo.findByClerkId.mockResolvedValue(existing);
      const updated = buildDbUser({ displayName: 'Gerson García' });
      repo.update.mockResolvedValue(updated);

      const result = await service.syncUserFromClerk(buildClerkUser());

      expect(repo.update).toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it('returns existing user without DB write when nothing changed', async () => {
      const existing = buildDbUser();
      repo.findByClerkId.mockResolvedValue(existing);

      const result = await service.syncUserFromClerk(buildClerkUser());

      expect(repo.update).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('throws when Clerk payload has no emails', async () => {
      await expect(
        service.syncUserFromClerk(buildClerkUser({ email_addresses: [] })),
      ).rejects.toThrow(/no email addresses/i);
    });
  });

  describe('deleteUserByClerkId', () => {
    it('deletes the matching user', async () => {
      repo.findByClerkId.mockResolvedValue(buildDbUser());

      await service.deleteUserByClerkId('clerk_abc');

      expect(repo.delete).toHaveBeenCalledWith('user_1');
    });

    it('is a no-op when user is not in DB', async () => {
      repo.findByClerkId.mockResolvedValue(null);

      await service.deleteUserByClerkId('unknown');

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });
});
