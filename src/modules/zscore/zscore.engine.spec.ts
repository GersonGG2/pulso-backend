import { PlayerTier } from '@prisma/client';
import { computeDelta, expectedScore, K_FACTOR } from './zscore.engine';

describe('zscore.engine', () => {
  describe('expectedScore', () => {
    it('is 0.5 when ratings are equal', () => {
      expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
    });

    it('is > 0.5 when player is higher', () => {
      expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5);
    });

    it('is < 0.5 when player is lower', () => {
      expect(expectedScore(1300, 1500)).toBeLessThan(0.5);
    });
  });

  describe('computeDelta', () => {
    const amateur = { weight: 'AMATEUR' as const };

    it('winner of equal-rating match gains roughly K/2', () => {
      const result = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        1,
        amateur,
      );
      expect(result.delta).toBe(Math.round(K_FACTOR / 2));
    });

    it('loser of equal-rating match loses roughly K/2', () => {
      const result = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        0,
        amateur,
      );
      expect(result.delta).toBe(-Math.round(K_FACTOR / 2));
    });

    it('upset bonus: winning vs higher tier multiplies the gain', () => {
      const baseline = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        1,
        amateur,
      );
      const upset = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.SEMI_PRO },
        1,
        amateur,
      );
      expect(upset.delta).toBeGreaterThan(baseline.delta);
      expect(upset.breakdown.tierMismatchApplied).toBe(true);
    });

    it('upset penalty: losing vs lower tier multiplies the loss', () => {
      const baseline = computeDelta(
        { zScore: 1500, tier: PlayerTier.SEMI_PRO },
        { zScore: 1500, tier: PlayerTier.SEMI_PRO },
        0,
        amateur,
      );
      const punished = computeDelta(
        { zScore: 1500, tier: PlayerTier.SEMI_PRO },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        0,
        amateur,
      );
      expect(punished.delta).toBeLessThan(baseline.delta);
      expect(punished.breakdown.tierMismatchApplied).toBe(true);
    });

    it('flagship tournaments amplify gains 2×', () => {
      const amateurResult = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        1,
        amateur,
      );
      const flagshipResult = computeDelta(
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        1,
        { weight: 'FLAGSHIP' },
      );
      expect(flagshipResult.delta).toBe(amateurResult.delta * 2);
    });

    it('expected score and base are returned in breakdown', () => {
      const result = computeDelta(
        { zScore: 1700, tier: PlayerTier.COMPETIDOR },
        { zScore: 1500, tier: PlayerTier.AMATEUR },
        1,
        amateur,
      );
      expect(result.breakdown.expectedScore).toBeGreaterThan(0.5);
      expect(typeof result.breakdown.base).toBe('number');
    });
  });
});
