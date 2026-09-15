import {
  DECK_SIZE,
  dayNumber,
  dealFor,
  isWon,
  legalMoves,
  applyMove,
  solvable,
  dailyDeal,
  type Deal,
} from '../klondike';

describe('the deck', () => {
  it('deals a full standard deck with no card missing or repeated', () => {
    for (let day = 0; day < 40; day += 1) {
      const deal = dealFor(day);
      const seen = new Set<string>();
      for (const pile of deal.tableau) for (const c of pile) seen.add(`${c.rank}${c.suit}`);
      for (const c of deal.stock) seen.add(`${c.rank}${c.suit}`);
      expect(seen.size).toBe(DECK_SIZE);
    }
  });

  it('builds the classic tableau: one card in the first pile, seven in the last', () => {
    const deal = dealFor(3);
    expect(deal.tableau).toHaveLength(7);
    deal.tableau.forEach((pile, i) => expect(pile).toHaveLength(i + 1));
  });

  it('turns exactly the last card of each pile face up', () => {
    const deal = dealFor(5);
    for (const pile of deal.tableau) {
      expect(pile[pile.length - 1]!.faceUp).toBe(true);
      expect(pile.slice(0, -1).every((c) => !c.faceUp)).toBe(true);
    }
  });

  it('gives everyone the same deal for a day, and a different one tomorrow', () => {
    const a = dealFor(dayNumber(Date.UTC(2026, 8, 15)));
    const b = dealFor(dayNumber(Date.UTC(2026, 8, 15)));
    const c = dealFor(dayNumber(Date.UTC(2026, 8, 16)));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('winning', () => {
  it('is won only when every foundation holds thirteen cards', () => {
    const deal = dealFor(1);
    expect(isWon(deal)).toBe(false);
  });
});

describe('moves', () => {
  it('offers at least one legal move on a fresh deal', () => {
    for (let day = 0; day < 10; day += 1) {
      expect(legalMoves(dealFor(day)).length).toBeGreaterThan(0);
    }
  });

  it('applying a move returns a different state and never mutates the original', () => {
    const deal = dealFor(2);
    const before = JSON.stringify(deal);
    const move = legalMoves(deal)[0]!;
    const after = applyMove(deal, move);
    expect(JSON.stringify(deal)).toBe(before);
    expect(JSON.stringify(after)).not.toBe(before);
  });
});

describe('the solvability proof', () => {
  // This is the claim: "guaranteed winnable". A deal that the solver cannot
  // finish must never reach a player.
  it('agrees that a solved board is solvable', () => {
    const won: Deal = {
      tableau: [[], [], [], [], [], [], []],
      stock: [],
      waste: [],
      foundations: { S: 13, H: 13, D: 13, C: 13 },
    };
    expect(isWon(won)).toBe(true);
    expect(solvable(won)).toBe(true);
  });

  it('rejects a board with no moves and cards outstanding', () => {
    const stuck: Deal = {
      tableau: [[], [], [], [], [], [], []],
      stock: [],
      waste: [],
      foundations: { S: 12, H: 13, D: 13, C: 13 },
    };
    expect(solvable(stuck)).toBe(false);
  });

  it('proves every daily deal it hands out is winnable', () => {
    for (let day = 0; day < 12; day += 1) {
      const deal = dailyDeal(day);
      expect(solvable(deal)).toBe(true);
    }
  });

  it('gives the same daily deal for the same day', () => {
    expect(dailyDeal(9)).toEqual(dailyDeal(9));
  });
});
