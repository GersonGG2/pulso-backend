/**
 * Subset of Riot Games API responses we consume.
 * Docs: https://developer.riotgames.com/apis
 */

/** Response from Account-V1 (regional routing: americas/asia/europe). */
export interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

/** Response from Summoner-V4 (platform routing: la1/la2/na1...). */
export interface RiotSummonerDto {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

/** Single entry in League-V4 response (one per queue type). */
export interface RiotLeagueEntryDto {
  leagueId: string;
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

/**
 * Pulso-supported regions. Maps user-facing names to Riot routing IDs.
 *   LAN = Mexico/Centroamérica → platform la1, regional americas
 *   LAS = Cono Sur            → platform la2, regional americas
 *   NA  = North America       → platform na1, regional americas
 */
export type PulsoRegion = 'LAN' | 'LAS' | 'NA';

export const PLATFORM_ROUTING: Record<PulsoRegion, string> = {
  LAN: 'la1',
  LAS: 'la2',
  NA: 'na1',
};

export const REGIONAL_ROUTING: Record<PulsoRegion, string> = {
  LAN: 'americas',
  LAS: 'americas',
  NA: 'americas',
};

/** Tier ordering used to compute "highest rank ever" on each sync. */
export const TIER_ORDER = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
] as const;

export type RiotTier = (typeof TIER_ORDER)[number];

export function tierRank(tier: string | null | undefined): number {
  if (!tier) return -1;
  const idx = TIER_ORDER.indexOf(tier.toUpperCase() as RiotTier);
  return idx;
}

export function maxTier(a: string | null, b: string | null): string | null {
  return tierRank(a) >= tierRank(b) ? a : b;
}
