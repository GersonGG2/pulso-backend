import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async getByUsername(username: string): Promise<User> {
    const user = await this.users.findByUsername(username);
    if (!user) throw new NotFoundException(`User @${username} not found`);
    return user;
  }

  async getByClerkId(clerkUserId: string): Promise<User> {
    const user = await this.users.findByClerkId(clerkUserId);
    if (!user) throw new NotFoundException('User not found for given Clerk identity');
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<User> {
    if (dto.username) {
      const existing = await this.users.findByUsername(dto.username);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Username @${dto.username} is already taken`);
      }
    }

    return this.users.update(id, {
      ...(dto.displayName !== undefined && { displayName: dto.displayName }),
      ...(dto.username !== undefined && { username: dto.username }),
      ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
    });
  }
}
