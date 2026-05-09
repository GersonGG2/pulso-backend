import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PLATFORM_ROUTING,
  PulsoRegion,
  REGIONAL_ROUTING,
  RiotAccountDto,
  RiotLeagueEntryDto,
  RiotSummonerDto,
} from './riot-api.types';

/**
 * Thin HTTP client over the Riot Games API.
 * Uses native fetch (Node 20+). Wraps:
 *   - Account-V1   (regional)
 *   - Summoner-V4  (platform)
 *   - League-V4    (platform)
 *
 * Tournament-V5 is intentionally NOT wrapped here — it requires Production API Key.
 * We will add it once Riot approves the key.
 */
@Injectable()
export class RiotApiService {
  private readonly logger = new Logger(RiotApiService.name);
  private readonly defaultTimeoutMs = 8_000;

  constructor(private readonly config: ConfigService) {}

  // -----------------------------
  // Account-V1
  // -----------------------------

  async getAccountByRiotId(
    region: PulsoRegion,
    gameName: string,
    tagLine: string,
  ): Promise<RiotAccountDto | null> {
    const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName,
    )}/${encodeURIComponent(tagLine)}`;
    return this.get<RiotAccountDto>(this.regionalBase(region), path);
  }

  // -----------------------------
  // Summoner-V4
  // -----------------------------

  async getSummonerByPuuid(
    region: PulsoRegion,
    puuid: string,
  ): Promise<RiotSummonerDto | null> {
    const path = `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
    return this.get<RiotSummonerDto>(this.platformBase(region), path);
  }

  // -----------------------------
  // League-V4
  // -----------------------------

  /**
   * Fetch ranked entries by PUUID. Preferred over the deprecated by-summoner
   * variant since Riot phased out summonerId in late 2024.
   */
  async getLeagueEntriesByPuuid(
    region: PulsoRegion,
    puuid: string,
  ): Promise<RiotLeagueEntryDto[]> {
    const path = `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
    return (await this.get<RiotLeagueEntryDto[]>(this.platformBase(region), path)) ?? [];
  }

  // -----------------------------
  // Internal
  // -----------------------------

  private platformBase(region: PulsoRegion): string {
    return `https://${PLATFORM_ROUTING[region]}.api.riotgames.com`;
  }

  private regionalBase(region: PulsoRegion): string {
    return `https://${REGIONAL_ROUTING[region]}.api.riotgames.com`;
  }

  private async get<T>(base: string, path: string): Promise<T | null> {
    const apiKey = this.config.get<string>('RIOT_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Riot API key not configured');
    }

    const url = `${base}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          'X-Riot-Token': apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (res.status === 404) return null;

      if (res.status === 429) {
        this.logger.warn(`Riot API rate limit hit on ${path}`);
        throw new ServiceUnavailableException('Riot API rate limit reached, retry shortly');
      }

      if (res.status === 401 || res.status === 403) {
        this.logger.error(`Riot API auth failed (${res.status}) on ${path}`);
        throw new ServiceUnavailableException('Riot API authentication failed');
      }

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Riot API error ${res.status} on ${path}: ${body}`);
        throw new ServiceUnavailableException(`Riot API error ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        this.logger.warn(`Riot API timeout on ${path}`);
        throw new ServiceUnavailableException('Riot API timeout');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
