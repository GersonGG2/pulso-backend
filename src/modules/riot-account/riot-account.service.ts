import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RiotAccount } from '@prisma/client';
import { RiotApiService } from './riot-api.service';
import { RiotAccountRepository } from './riot-account.repository';
import { InitiateLinkDto, InitiateLinkResponseDto } from './dto/initiate-link.dto';
import { maxTier, PulsoRegion, RiotLeagueEntryDto } from './riot-api.types';

const LINK_ATTEMPT_TTL_MS = 15 * 60 * 1000; // 15 minutes
/** Default LoL profile icons (always available to every account, never locked). */
const SAFE_ICON_RANGE_MAX = 28;

@Injectable()
export class RiotAccountService {
  private readonly logger = new Logger(RiotAccountService.name);

  constructor(
    private readonly repo: RiotAccountRepository,
    private readonly riot: RiotApiService,
  ) {}

  async getMyAccount(userId: string): Promise<RiotAccount> {
    const account = await this.repo.findByUserId(userId);
    if (!account) throw new NotFoundException('No Riot account linked');
    return account;
  }

  async unlink(userId: string): Promise<void> {
    const existing = await this.repo.findByUserId(userId);
    if (!existing) throw new NotFoundException('No Riot account to unlink');
    await this.repo.delete(userId);
    this.logger.log(`Unlinked Riot account for user ${userId}`);
  }

  /**
   * Step 1 of linking: resolve the Riot ID, decide an expected icon, persist the attempt.
   * Returns instructions the frontend will show to the user.
   */
  async initiateLink(userId: string, dto: InitiateLinkDto): Promise<InitiateLinkResponseDto> {
    // Reject if already linked
    if (await this.repo.findByUserId(userId)) {
      throw new ConflictException('You already have a Riot account linked. Unlink it first.');
    }

    const region = dto.region as PulsoRegion;

    const account = await this.riot.getAccountByRiotId(region, dto.gameName, dto.tagLine);
    if (!account) {
      throw new NotFoundException(
        `No Riot account found for ${dto.gameName}#${dto.tagLine} in ${region}`,
      );
    }

    // Reject if this puuid is already linked to a different platform user
    const claimed = await this.repo.findByPuuid(account.puuid);
    if (claimed) {
      throw new ConflictException('This Riot account is already linked to another Pulso user');
    }

    const summoner = await this.riot.getSummonerByPuuid(region, account.puuid);
    if (!summoner) {
      throw new NotFoundException(
        `Riot account exists but has no LoL summoner on ${region}. Play a game first.`,
      );
    }

    const originalIconId = summoner.profileIconId;
    const expectedIconId = this.pickIconDistinctFrom(originalIconId);
    const expiresAt = new Date(Date.now() + LINK_ATTEMPT_TTL_MS);

    await this.repo.upsertAttempt(userId, {
      puuid: account.puuid,
      summonerId: summoner.id,
      gameName: account.gameName,
      tagLine: account.tagLine,
      region,
      expectedIconId,
      originalIconId,
      expiresAt,
    });

    return {
      expectedIconId,
      originalIconId,
      expiresAt,
      riotId: `${account.gameName}#${account.tagLine}`,
      instructions: `Cambia tu icono de invocador al ID ${expectedIconId} en tu cliente de League of Legends, espera 30 segundos a que sincronice, y luego confirma. Tienes hasta ${expiresAt.toISOString()}.`,
    };
  }

  /**
   * Step 2 of linking: re-fetch the summoner; if profileIconId matches expected,
   * persist the RiotAccount, capture rank, and clear the attempt.
   */
  async confirmLink(userId: string): Promise<RiotAccount> {
    const attempt = await this.repo.findAttemptByUserId(userId);
    if (!attempt) {
      throw new NotFoundException('No pending link attempt — start with /riot-account/initiate-link');
    }
    if (attempt.expiresAt.getTime() < Date.now()) {
      await this.repo.deleteAttempt(userId);
      throw new GoneException('Link attempt expired. Restart the flow.');
    }

    const region = attempt.region as PulsoRegion;
    const summoner = await this.riot.getSummonerByPuuid(region, attempt.puuid);
    if (!summoner) {
      throw new NotFoundException('Summoner no longer found on Riot — try restarting the flow');
    }

    if (summoner.profileIconId !== attempt.expectedIconId) {
      throw new BadRequestException(
        `Icon mismatch: expected ${attempt.expectedIconId} but your profile shows ${summoner.profileIconId}. Update your icon in the LoL client and confirm again.`,
      );
    }

    // Pull rank for anti-smurf snapshot
    const entries = await this.riot.getLeagueEntries(region, summoner.id);
    const solo = entries.find((e) => e.queueType === 'RANKED_SOLO_5x5');
    const currentTier = solo?.tier ?? null;
    const currentRank = solo?.rank ?? null;
    const currentLP = solo?.leaguePoints ?? null;
    const highestRankEver = this.computeHighestRank(entries);

    const created = await this.repo.upsert(
      userId,
      {
        user: { connect: { id: userId } },
        puuid: attempt.puuid,
        summonerId: summoner.id,
        gameName: attempt.gameName,
        tagLine: attempt.tagLine,
        region: attempt.region,
        summonerLevel: summoner.summonerLevel,
        currentTier,
        currentRank,
        currentLP,
        highestRankEver,
      },
      {
        summonerId: summoner.id,
        summonerLevel: summoner.summonerLevel,
        currentTier,
        currentRank,
        currentLP,
        highestRankEver: maxTier(highestRankEver, currentTier),
        lastSyncedAt: new Date(),
      },
    );

    await this.repo.deleteAttempt(userId);
    this.logger.log(
      `Linked Riot account for user ${userId}: ${attempt.gameName}#${attempt.tagLine} (${region}, tier ${currentTier ?? 'unranked'})`,
    );

    return created;
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private pickIconDistinctFrom(currentIconId: number): number {
    let next = currentIconId;
    let attempts = 0;
    while (next === currentIconId && attempts < 10) {
      next = Math.floor(Math.random() * (SAFE_ICON_RANGE_MAX + 1));
      attempts += 1;
    }
    if (next === currentIconId) {
      next = (currentIconId + 1) % (SAFE_ICON_RANGE_MAX + 1);
    }
    return next;
  }

  private computeHighestRank(entries: RiotLeagueEntryDto[]): string | null {
    if (entries.length === 0) return null;
    return entries.reduce<string | null>((acc, e) => maxTier(acc, e.tier), null);
  }
}
