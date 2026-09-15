/**
 * Days won, the streak, and what the purchase opens.
 *
 * Two paid claims live here: undo beyond the free allowance, and the archive
 * beyond the recent days. Each takes `isPremium` explicitly at the call site.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export const GAME_CACHE_KEY = 'solari.state.v1';

/** Undos a free player gets per deal. */
export const FREE_UNDOS = 3;
/** Past days a free player can open, counting back from today inclusive. */
export const FREE_ARCHIVE_DAYS = 3;

const MAX_RESULTS = 730;

export interface WinResult {
  day: number;
  moves: number;
  ms: number;
}

interface GameState {
  results: WinResult[];
  undosUsed: number;

  recordWin: (day: number, moves: number, ms: number) => void;
  resultFor: (day: number) => WinResult | undefined;
  streak: (today: number) => number;
  spendUndo: (isPremium: boolean) => 'ok' | 'locked';
  startDeal: () => void;
  canOpen: (day: number, today: number, isPremium: boolean) => boolean;
  persist: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function validResults(value: unknown): WinResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is WinResult =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as WinResult).day === 'number' &&
      typeof (r as WinResult).moves === 'number' &&
      typeof (r as WinResult).ms === 'number',
  );
}

export const useGameStore = create<GameState>((set, get) => ({
  results: [],
  undosUsed: 0,

  recordWin(day, moves, ms) {
    const existing = get().results.find((r) => r.day === day);
    // A replay keeps the tidier win rather than the latest one, so opening an
    // old deal to look at it cannot spoil a good result.
    if (existing && existing.moves <= moves) return;
    set((s) => ({
      results: [...s.results.filter((r) => r.day !== day), { day, moves, ms }]
        .sort((a, b) => a.day - b.day)
        .slice(-MAX_RESULTS),
    }));
    void get().persist();
  },

  resultFor(day) {
    return get().results.find((r) => r.day === day);
  },

  streak(today) {
    const days = new Set(get().results.map((r) => r.day));
    let streak = 0;
    for (let day = today; days.has(day); day -= 1) streak += 1;
    return streak;
  },

  spendUndo(isPremium) {
    if (!isPremium && get().undosUsed >= FREE_UNDOS) return 'locked';
    set((s) => ({ undosUsed: s.undosUsed + 1 }));
    return 'ok';
  },

  startDeal() {
    set({ undosUsed: 0 });
  },

  canOpen(day, today, isPremium) {
    if (day > today) return false;
    return isPremium || day > today - FREE_ARCHIVE_DAYS;
  },

  async persist() {
    try {
      await AsyncStorage.setItem(GAME_CACHE_KEY, JSON.stringify({ results: get().results }));
    } catch {
      // A lost history is survivable; a failed launch is not.
    }
  },

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(GAME_CACHE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      set({ results: validResults((parsed as Record<string, unknown>).results) });
    } catch {
      // Unreadable storage starts empty rather than preventing launch.
    }
  },
}));
