/**
 * Returns true when n is a positive power of two.
 * Bracket generation requires powers of two (no byes in MVP).
 */
export function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Fisher-Yates shuffle. Used for random seeding of round 1.
 * Returns a new array.
 */
export function shuffle<T>(input: readonly T[]): T[] {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "R1-M3" → { round: 1, match: 3 } */
export function parseBracketPosition(pos: string): { round: number; match: number } {
  const m = /^R(\d+)-M(\d+)$/.exec(pos);
  if (!m) throw new Error(`Invalid bracket position: ${pos}`);
  return { round: Number(m[1]), match: Number(m[2]) };
}

export function bracketPosition(round: number, match: number): string {
  return `R${round}-M${match}`;
}

/**
 * Given a match position in round N, return the "sibling" match index
 * whose winner faces this winner in round N+1.
 *   M1 ↔ M2,  M3 ↔ M4,  M5 ↔ M6 …
 */
export function siblingMatchIndex(matchIndex: number): number {
  return matchIndex % 2 === 1 ? matchIndex + 1 : matchIndex - 1;
}

/** Position of the match in round N+1 that consumes winners from M{x} and its sibling. */
export function nextRoundPosition(round: number, matchIndex: number): string {
  return bracketPosition(round + 1, Math.ceil(matchIndex / 2));
}
