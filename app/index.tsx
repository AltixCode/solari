import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Board } from '@/components/Board';
import { Button, Card as Surface, Text } from '@/components/ui';
import { t } from '@/i18n';
import {
  applyMove,
  dailyDeal,
  dayNumber,
  isWon,
  legalMoves,
  type Deal,
  type Move,
} from '@/logic/klondike';
import { noteGameFinished } from '@/monetization/pacing';
import { FREE_ARCHIVE_DAYS, FREE_UNDOS, useGameStore } from '@/store/useGameStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { MIN_TOUCH_TARGET, useTheme, withAlpha } from '@/theme';

const ARCHIVE_SPAN = 10;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const isReady = usePremiumStore((s) => s.isReady);
  const hydrate = useGameStore((s) => s.hydrate);
  const recordWin = useGameStore((s) => s.recordWin);
  const resultFor = useGameStore((s) => s.resultFor);
  const streak = useGameStore((s) => s.streak);
  const spendUndo = useGameStore((s) => s.spendUndo);
  const startDeal = useGameStore((s) => s.startDeal);
  const canOpen = useGameStore((s) => s.canOpen);

  const [today] = useState(() => dayNumber(Date.now()));
  const [day, setDay] = useState(() => dayNumber(Date.now()));
  const [deal, setDeal] = useState<Deal | null>(null);
  const [past, setPast] = useState<Deal[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const open = useCallback(
    (target: number) => {
      // The solver runs here, so the deal handed over is one it has won.
      setDeal(dailyDeal(target));
      setPast([]);
      setMoves(0);
      setStartedAt(Date.now());
      startDeal();
      setDay(target);
    },
    [startDeal],
  );

  const play = useCallback(
    (move: Move) => {
    if (!deal) return;
    const next = applyMove(deal, move);
    setPast((p) => [...p, deal]);
    setDeal(next);
    setMoves((m) => m + 1);
    void Haptics.selectionAsync();

    if (isWon(next)) {
      recordWin(day, moves + 1, Date.now() - startedAt);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void noteGameFinished();
    }
    },
    [deal, day, moves, startedAt, recordWin, isPremium, isReady],
  );

  const undo = () => {
    if (past.length === 0) return;
    if (spendUndo(isPremium) === 'locked') {
      router.push('/paywall');
      return;
    }
    setDeal(past[past.length - 1]!);
    setPast((p) => p.slice(0, -1));
  };

  const openArchive = (target: number) => {
    if (!canOpen(target, today, isPremium)) {
      router.push('/paywall');
      return;
    }
    open(target);
  };

  const result = resultFor(day);
  const days = streak(today);
  const moveList = deal ? legalMoves(deal) : [];
  const drawMove = moveList.find((m) => m.kind === 'draw' || m.kind === 'recycle');
  const won = deal ? isWon(deal) : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.base,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing.xl,
          gap: spacing.base,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text variant="title" style={styles.grow}>
            {t('appName')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settingsTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={8}
            style={styles.iconSlot}
          >
            <Feather name="settings" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text variant="heading">{t('todayDeal')}</Text>
        <Text variant="caption" tone="muted">
          {t('guaranteedWinnable')}
        </Text>
        {days > 0 ? (
          <Text variant="caption" tone="muted">
            {t('streakLabel', { n: days })}
          </Text>
        ) : null}

        {deal === null ? (
          <Button label={t('dealCta')} icon="layers" onPress={() => open(day)} />
        ) : (
          <>
            <Board deal={deal} />

            <View style={styles.controls}>
              <Button
                label={t('drawCta')}
                variant="secondary"
                disabled={!drawMove}
                onPress={() => drawMove && play(drawMove)}
              />
              <Button
                label={t('undoCta')}
                variant="ghost"
                disabled={past.length === 0}
                onPress={undo}
              />
            </View>

            {won ? (
              <Surface>
                <Text variant="heading">{t('wonTitle')}</Text>
                <Text variant="body">
                  {t('movesLabel')}: {moves}
                </Text>
              </Surface>
            ) : (
              moveList
                .filter((m) => m.kind !== 'draw' && m.kind !== 'recycle')
                .slice(0, 8)
                .map((move, i) => (
                  <Pressable
                    key={`${move.kind}-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={describe(move)}
                    onPress={() => play(move)}
                    style={[
                      styles.move,
                      {
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.base,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                  >
                    <Text variant="body">{describe(move)}</Text>
                  </Pressable>
                ))
            )}
            {isPremium ? null : (
              <Text variant="caption" tone="muted">
                {t('undoLocked', { n: FREE_UNDOS })}
              </Text>
            )}
          </>
        )}

        {result ? (
          <Text variant="caption" tone="muted">
            {t('wonTitle')} · {t('movesLabel')}: {result.moves}
          </Text>
        ) : null}

        <Text variant="heading" style={{ marginTop: spacing.base }}>
          {t('archiveTitle')}
        </Text>
        <View style={[styles.chipRow, { gap: spacing.sm }]}>
          {Array.from({ length: ARCHIVE_SPAN }, (_, i) => today - i).map((target) => {
            const allowed = canOpen(target, today, isPremium);
            const label = target === today ? t('todayDeal') : `-${today - target}`;
            const chosen = target === day;
            return (
              <Pressable
                key={target}
                accessibilityRole="button"
                accessibilityLabel={allowed ? label : t('dayLocked')}
                accessibilityState={{ selected: chosen, disabled: !allowed }}
                onPress={() => openArchive(target)}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.base,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: chosen ? colors.accent : colors.border,
                    backgroundColor: chosen ? withAlpha(colors.accent, 0.16) : colors.surface,
                  },
                ]}
              >
                {/* Full contrast whether locked or not. */}
                <Text variant="body">{label}</Text>
                {allowed ? null : <Feather name="lock" size={14} color={colors.textMuted} />}
              </Pressable>
            );
          })}
        </View>
        {isPremium ? null : (
          <Text variant="caption" tone="muted">
            {t('archiveLocked', { n: FREE_ARCHIVE_DAYS })}
          </Text>
        )}
      </ScrollView>
      <BannerAdSlot />
    </View>
  );
}

/**
 * A move as a short readable label, used for the button and its accessibility name.
 *
 * These six strings were hardcoded English in an app that ships fourteen
 * locales, and nothing caught it: `check-ui-rules` looks for a literal written
 * AT the call site -- a JSX text node, an attribute, an `Alert` -- and these
 * arrive through `{describe(move)}`, an expression it cannot follow. They were
 * the accessibility labels too, so a screen-reader user in any of the other
 * thirteen languages heard English.
 */
function describe(move: Move): string {
  switch (move.kind) {
    case 'wasteToFoundation':
      return t('moveWasteToFoundation');
    case 'tableauToFoundation':
      return t('moveTableauToFoundation', { n: move.pile + 1 });
    case 'wasteToTableau':
      return t('moveWasteToTableau', { n: move.pile + 1 });
    case 'tableauToTableau':
      return t('moveTableauToTableau', { from: move.from + 1, to: move.to + 1 });
    case 'draw':
      return t('moveDraw');
    default:
      return t('moveRecycle');
  }
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  iconSlot: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundations: { flexDirection: 'row', gap: 8 },
  foundation: { flex: 1, alignItems: 'center' },
  controls: { flexDirection: 'row', gap: 8 },
  move: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH_TARGET },
});
