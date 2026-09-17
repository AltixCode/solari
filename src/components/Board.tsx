import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { SUITS, type Deal, type Suit } from '@/logic/klondike';
import {
  BASE_CARD_METRICS,
  PlayingCard,
  cardMetricsForWidth,
  tableauHeight,
} from '@/components/PlayingCard';

const PIPS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

interface Props {
  deal: Deal;
}

/**
 * The Klondike board: stock, waste, four foundations and seven tableau piles.
 *
 * This renders the deal the engine already holds and changes no game state --
 * moves are still played through the labelled move list, which is reachable by
 * VoiceOver and by the capture route, where dragging cards would be neither.
 * So the board is what the player reads and the list is what they act on.
 *
 * Tableau piles overlap so a long pile stays on screen: a face-down card shows
 * less than a face-up one because it carries no information worth the space.
 */
export const Board: React.FC<Props> = ({ deal }) => {
  const { colors } = useTheme();
  const wasteTop = deal.waste[deal.waste.length - 1] ?? null;

  // Measured, not taken from the window.
  //
  // The board sits inside a column that is already capped and centred, so the
  // window width is the wrong number -- it would size the cards to space the
  // board does not have. `onLayout` is the width this component was actually
  // given, which is also what makes this correct in split view, on an Android
  // tablet, and on a rotation.
  const [available, setAvailable] = useState(0);
  const metrics = available ? cardMetricsForWidth(available) : BASE_CARD_METRICS;

  const pileHeight = (pile: Deal['tableau'][number]) =>
    pile.reduce(
      (height, card, index) =>
        index === pile.length - 1
          ? height + metrics.height
          : height + (card.faceUp ? metrics.peek : metrics.peekDown),
      0,
    );

  const tallest = Math.max(metrics.height, ...deal.tableau.map(pileHeight));

  return (
    <View
      style={styles.board}
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      <View style={styles.topRow}>
        <View style={styles.slot}>
          <PlayingCard
            card={deal.stock.length ? { rank: 0, suit: 'S', faceUp: false } : null}
            placeholder={deal.stock.length ? undefined : '↻'}
            metrics={metrics}
          />
          <Text variant="micro" tone="muted">
            {deal.stock.length}
          </Text>
        </View>

        <View style={styles.slot}>
          <PlayingCard card={wasteTop} metrics={metrics} />
          <Text variant="micro" tone="muted">
            {deal.waste.length}
          </Text>
        </View>

        <View style={styles.spacer} />

        {SUITS.map((suit) => {
          const rank = deal.foundations[suit];
          return (
            <View key={suit} style={styles.slot}>
              <PlayingCard
                card={rank ? { rank, suit, faceUp: true } : null}
                placeholder={PIPS[suit]}
                metrics={metrics}
              />
              <Text variant="micro" tone="muted">
                {rank ? RANKS[rank] : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.tableau, { height: tableauHeight(tallest) }]}>
          {deal.tableau.map((pile, index) => (
            <View key={index} style={[styles.pile, { width: metrics.width }]}>
              {pile.length === 0 ? (
                <PlayingCard card={null} metrics={metrics} />
              ) : (
                pile.map((card, position) => {
                  const above = pile.slice(0, position);
                  const top = above.reduce(
                    (offset, c) => offset + (c.faceUp ? metrics.peek : metrics.peekDown),
                    0,
                  );
                  return (
                    <View key={position} style={[styles.stacked, { top }]}>
                      <PlayingCard card={card} metrics={metrics} />
                    </View>
                  );
                })
              )}
              <Text variant="micro" tone="muted" style={[styles.pileLabel, { top: tallest }]}>
                {index + 1}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.rule, { backgroundColor: colors.border }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  board: { gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  slot: { alignItems: 'center', gap: 2 },
  spacer: { flex: 1 },
  tableau: { flexDirection: 'row', gap: 6, paddingBottom: 14 },
  pile: {},
  stacked: { position: 'absolute', left: 0 },
  pileLabel: { position: 'absolute', alignSelf: 'center' },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 4 },
});
