import { PlayerTier } from '@prisma/client';

/**
 * Map a ZScore value to its PlayerTier bucket.
 * Thresholds will be tuned with real data after MVP launch.
 */
export function tierFromZScore(score: number): PlayerTier {
  if (score >= 2400) return PlayerTier.PRO;
  if (score >= 2000) return PlayerTier.SEMI_PRO;
  if (score >= 1700) return PlayerTier.COMPETIDOR;
  return PlayerTier.AMATEUR;
}

export const TIER_RANK: Record<PlayerTier, number> = {
  AMATEUR: 0,
  COMPETIDOR: 1,
  SEMI_PRO: 2,
  PRO: 3,
};
