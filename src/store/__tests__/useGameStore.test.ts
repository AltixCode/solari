import AsyncStorage from '@react-native-async-storage/async-storage';

import { dayNumber } from '@/logic/klondike';
import { FREE_ARCHIVE_DAYS, FREE_UNDOS, GAME_CACHE_KEY, useGameStore } from '../useGameStore';

const DAY = dayNumber(Date.UTC(2026, 8, 15));
const reset = () => useGameStore.setState({ results: [], undosUsed: 0 });

beforeEach(async () => {
  await AsyncStorage.clear();
  reset();
});

describe('results', () => {
  it('records a won day once', () => {
    useGameStore.getState().recordWin(DAY, 120, 60_000);
    useGameStore.getState().recordWin(DAY, 300, 90_000);
    expect(useGameStore.getState().results).toHaveLength(1);
  });

  it('keeps the fewer-moves attempt when a day is replayed', () => {
    useGameStore.getState().recordWin(DAY, 300, 90_000);
    useGameStore.getState().recordWin(DAY, 120, 60_000);
    expect(useGameStore.getState().resultFor(DAY)!.moves).toBe(120);
  });

  it('knows whether a day is done', () => {
    expect(useGameStore.getState().resultFor(DAY)).toBeUndefined();
    useGameStore.getState().recordWin(DAY, 100, 1000);
    expect(useGameStore.getState().resultFor(DAY)).toBeDefined();
  });

  it('counts a streak of consecutive wins', () => {
    useGameStore.getState().recordWin(DAY - 1, 100, 1000);
    useGameStore.getState().recordWin(DAY, 100, 1000);
    expect(useGameStore.getState().streak(DAY)).toBe(2);
  });

  it('breaks the streak on a missed day', () => {
    useGameStore.getState().recordWin(DAY - 2, 100, 1000);
    useGameStore.getState().recordWin(DAY, 100, 1000);
    expect(useGameStore.getState().streak(DAY)).toBe(1);
  });
});

describe('undo', () => {
  it('lets a free player undo a limited number of times', () => {
    for (let i = 0; i < FREE_UNDOS; i += 1) {
      expect(useGameStore.getState().spendUndo(false)).toBe('ok');
    }
    expect(useGameStore.getState().spendUndo(false)).toBe('locked');
  });

  it('never runs out for a paid player', () => {
    for (let i = 0; i < FREE_UNDOS + 20; i += 1) {
      expect(useGameStore.getState().spendUndo(true)).toBe('ok');
    }
  });

  it('resets the count when a new deal starts', () => {
    useGameStore.getState().spendUndo(false);
    useGameStore.getState().startDeal();
    expect(useGameStore.getState().undosUsed).toBe(0);
  });
});

describe('the archive', () => {
  it('opens recent days to everyone and the rest to paid players', () => {
    expect(useGameStore.getState().canOpen(DAY, DAY, false)).toBe(true);
    expect(useGameStore.getState().canOpen(DAY - FREE_ARCHIVE_DAYS, DAY, false)).toBe(false);
    expect(useGameStore.getState().canOpen(DAY - 40, DAY, true)).toBe(true);
  });

  it('never opens a day that has not happened', () => {
    expect(useGameStore.getState().canOpen(DAY + 1, DAY, true)).toBe(false);
  });
});

describe('hydrate', () => {
  it('restores results', async () => {
    useGameStore.getState().recordWin(DAY, 100, 1000);
    await useGameStore.getState().persist();
    reset();
    await useGameStore.getState().hydrate();
    expect(useGameStore.getState().resultFor(DAY)).toBeDefined();
  });

  it('starts empty rather than throwing on unreadable storage', async () => {
    await AsyncStorage.setItem(GAME_CACHE_KEY, '<<<');
    await useGameStore.getState().hydrate();
    expect(useGameStore.getState().results).toEqual([]);
  });

  it('drops rows that are not shaped like a result', async () => {
    await AsyncStorage.setItem(
      GAME_CACHE_KEY,
      JSON.stringify({ results: [{ day: 'x' }, { day: DAY, moves: 100, ms: 1000 }] }),
    );
    await useGameStore.getState().hydrate();
    expect(useGameStore.getState().results).toHaveLength(1);
  });
});
