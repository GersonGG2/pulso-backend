import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { User, UserRole } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'clx_user_1',
  clerkUserId: 'clerk_1',
  email: 'gerson@example.com',
  username: 'gerson',
  displayName: 'Gerson',
  avatarUrl: null,
  role: UserRole.PLAYER,
  createdAt: new Date('2026-05-09T00:00:00Z'),
  updatedAt: new Date('2026-05-09T00:00:00Z'),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByUsername: jest.fn(),
            findByClerkId: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    repo = moduleRef.get(UsersRepository);
  });

  describe('getById', () => {
    it('returns the user when found', async () => {
      const user = buildUser();
      repo.findById.mockResolvedValue(user);

      await expect(service.getById('clx_user_1')).resolves.toEqual(user);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('updates display name without checking username uniqueness', async () => {
      const user = buildUser({ displayName: 'New Name' });
      repo.update.mockResolvedValue(user);

      const result = await service.updateProfile('clx_user_1', { displayName: 'New Name' });

      expect(repo.findByUsername).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('clx_user_1', { displayName: 'New Name' });
      expect(result).toEqual(user);
    });

    it('allows username change when nobody else holds it', async () => {
      const updated = buildUser({ username: 'new_handle' });
      repo.findByUsername.mockResolvedValue(null);
      repo.update.mockResolvedValue(updated);

      const result = await service.updateProfile('clx_user_1', { username: 'new_handle' });

      expect(repo.findByUsername).toHaveBeenCalledWith('new_handle');
      expect(result).toEqual(updated);
    });

    it('allows username change when the same user already holds it', async () => {
      const same = buildUser({ username: 'gerson' });
      repo.findByUsername.mockResolvedValue(same);
      repo.update.mockResolvedValue(same);

      await expect(
        service.updateProfile('clx_user_1', { username: 'gerson' }),
      ).resolves.toEqual(same);
    });

    it('rejects username change when another user holds it', async () => {
      const someoneElse = buildUser({ id: 'clx_user_2', username: 'taken' });
      repo.findByUsername.mockResolvedValue(someoneElse);

      await expect(
        service.updateProfile('clx_user_1', { username: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
