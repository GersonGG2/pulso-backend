import {
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { Player } from '@prisma/client';
import { RiotAccountRepository } from '../riot-account/riot-account.repository';
import { CreatePlayerDto } from './dto/create-player.dto';
import { SearchPlayersDto } from './dto/search-players.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { PlayerWithRelations, PlayersRepository } from './players.repository';
import { tierFromZScore } from './players.utils';

@Injectable()
export class PlayersService {
  constructor(
    private readonly players: PlayersRepository,
    private readonly riotAccounts: RiotAccountRepository,
  ) {}

  async getById(id: string): Promise<PlayerWithRelations> {
    const player = await this.players.findById(id);
    if (!player) throw new NotFoundException(`Player ${id} not found`);
    return player;
  }

  async getByUserId(userId: string): Promise<PlayerWithRelations> {
    const player = await this.players.findByUserId(userId);
    if (!player) throw new NotFoundException('No player profile for user');
    return player;
  }

  async createForUser(userId: string, dto: CreatePlayerDto): Promise<Player> {
    const existing = await this.players.findByUserId(userId);
    if (existing) {
      throw new ConflictException('You already have a player profile');
    }

    const riotAccount = await this.riotAccounts.findByUserId(userId);
    if (!riotAccount) {
      throw new PreconditionFailedException(
        'Link your Riot account before creating a player profile',
      );
    }

    return this.players.create({
      user: { connect: { id: userId } },
      country: dto.country,
      primaryRole: dto.primaryRole ?? null,
      secondaryRole: dto.secondaryRole ?? null,
      city: dto.city ?? null,
      birthDate: dto.birthDate ?? null,
      recruitable: dto.recruitable ?? true,
      // zScore, zScoreVolatility, zScoreDeviation, tier use Prisma defaults
    });
  }

  async updateMine(userId: string, dto: UpdatePlayerDto): Promise<PlayerWithRelations> {
    await this.getByUserId(userId); // throws NotFound if missing

    return this.players.update(userId, {
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.primaryRole !== undefined && { primaryRole: dto.primaryRole }),
      ...(dto.secondaryRole !== undefined && { secondaryRole: dto.secondaryRole }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate }),
      ...(dto.recruitable !== undefined && { recruitable: dto.recruitable }),
    });
  }

  async deleteMine(userId: string): Promise<void> {
    await this.getByUserId(userId);
    await this.players.delete(userId);
  }

  async search(query: SearchPlayersDto) {
    return this.players.search(
      {
        role: query.role,
        country: query.country,
        minTier: query.minTier,
        recruitable: query.recruitable,
      },
      { limit: query.limit, offset: query.offset },
    );
  }

  async leaderboard(query: SearchPlayersDto) {
    return this.players.search(
      {
        role: query.role,
        country: query.country,
      },
      { limit: query.limit, offset: query.offset },
      { zScore: 'desc' },
    );
  }

  /**
   * Apply a ZScore delta + recompute tier. Used by zscore module after matches.
   * Kept here to centralize tier derivation logic.
   */
  async applyZScoreDelta(userId: string, delta: number): Promise<PlayerWithRelations> {
    const player = await this.getByUserId(userId);
    const newScore = player.zScore + delta;
    return this.players.update(userId, {
      zScore: newScore,
      tier: tierFromZScore(newScore),
    });
  }
}
