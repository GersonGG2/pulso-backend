import { PlayerTier } from '@prisma/client';
import { TIER_RANK } from '../players/players.utils';

/**
 * MVP rating engine. Elo with Pulso bonifiers:
 *   - Tournament weight: amateur 1.0, official 1.5, flagship 2.0
 *   - Tier mismatch: ×1.15 when winning against higher tier or losing
 *     against lower tier (rewards upsets, punishes upsets-against)
 *
 * Glicko-2 (with deviation/volatility tracking) will replace this once we
 * have real match data to calibrate K and uncertainty parameters.
 */

export const K_FACTOR = 32;
export const TIER_MISMATCH_MULTIPLIER = 1.15;

export type TournamentWeight = 'AMATEUR' | 'OFFICIAL' | 'FLAGSHIP';

export const TOURNAMENT_WEIGHTS: Record<TournamentWeight, number> = {
  AMATEUR: 1.0,
  OFFICIAL: 1.5,
  FLAGSHIP: 2.0,
};

export interface RatingSnapshot {
  zScore: number;
  tier: PlayerTier;
}

export interface MatchContext {
  weight: TournamentWeight;
}

export interface DeltaBreakdown {
  base: number;
  tournamentWeight: number;
  tierMismatchApplied: boolean;
  expectedScore: number;
}

export interface DeltaResult {
  delta: number;
  breakdown: DeltaBreakdown;
}

/**
 * Probability of `me` beating `opponent` per Elo.
 * Returns a value in (0, 1).
 */
export function expectedScore(meRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - meRating) / 400));
}

/**
 * Compute the ZScore delta for a player given their match outcome.
 * outcome = 1 → win, 0 → loss.
 */
export function computeDelta(
  player: RatingSnapshot,
  opponent: RatingSnapshot,
  outcome: 0 | 1,
  context: MatchContext,
): DeltaResult {
  const expected = expectedScore(player.zScore, opponent.zScore);
  const base = K_FACTOR * (outcome - expected);

  const weightMultiplier = TOURNAMENT_WEIGHTS[context.weight];
  let weighted = base * weightMultiplier;

  const tierDiff = TIER_RANK[player.tier] - TIER_RANK[opponent.tier];
  let tierMismatchApplied = false;
  if (outcome === 1 && tierDiff < 0) {
    weighted *= TIER_MISMATCH_MULTIPLIER;
    tierMismatchApplied = true;
  } else if (outcome === 0 && tierDiff > 0) {
    weighted *= TIER_MISMATCH_MULTIPLIER;
    tierMismatchApplied = true;
  }

  return {
    delta: Math.round(weighted),
    breakdown: {
      base: Math.round(base * 100) / 100,
      tournamentWeight: weightMultiplier,
      tierMismatchApplied,
      expectedScore: Math.round(expected * 1000) / 1000,
    },
  };
}
