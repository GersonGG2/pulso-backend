import {
  bracketPosition,
  isPowerOfTwo,
  nextRoundPosition,
  parseBracketPosition,
  shuffle,
  siblingMatchIndex,
} from './matches.utils';

describe('matches.utils', () => {
  describe('isPowerOfTwo', () => {
    it.each([1, 2, 4, 8, 16, 32, 64, 128])('accepts %i', (n) => {
      expect(isPowerOfTwo(n)).toBe(true);
    });

    it.each([0, -2, 3, 5, 6, 7, 9, 100])('rejects %i', (n) => {
      expect(isPowerOfTwo(n)).toBe(false);
    });
  });

  describe('shuffle', () => {
    it('returns same elements in some order', () => {
      const input = [1, 2, 3, 4, 5];
      const shuffled = shuffle(input);
      expect(shuffled).toHaveLength(5);
      expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('does not mutate the input', () => {
      const input = [1, 2, 3];
      shuffle(input);
      expect(input).toEqual([1, 2, 3]);
    });
  });

  describe('bracketPosition / parseBracketPosition', () => {
    it('roundtrips', () => {
      expect(parseBracketPosition(bracketPosition(2, 3))).toEqual({ round: 2, match: 3 });
    });

    it('throws on invalid format', () => {
      expect(() => parseBracketPosition('foo')).toThrow();
    });
  });

  describe('siblingMatchIndex', () => {
    it.each([
      [1, 2],
      [2, 1],
      [3, 4],
      [4, 3],
      [5, 6],
      [6, 5],
    ])('sibling of %i is %i', (input, expected) => {
      expect(siblingMatchIndex(input)).toBe(expected);
    });
  });

  describe('nextRoundPosition', () => {
    it.each([
      [1, 1, 'R2-M1'],
      [1, 2, 'R2-M1'],
      [1, 3, 'R2-M2'],
      [1, 4, 'R2-M2'],
      [2, 1, 'R3-M1'],
      [2, 2, 'R3-M1'],
    ])('R%i M%i → %s', (round, match, expected) => {
      expect(nextRoundPosition(round, match)).toBe(expected);
    });
  });
});
