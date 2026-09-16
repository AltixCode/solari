import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { SUITS, type Deal, type Suit } from '@/logic/klondike';
import {
  CARD_HEIGHT,
  CARD_PEEK,
  CARD_PEEK_DOWN,
  CARD_WIDTH,
  PlayingCard,
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

  const pileHeight = (pile: Deal['tableau'][number]) =>
    pile.reduce(
      (height, card, index) =>
        index === pile.length - 1
          ? height + CARD_HEIGHT
          : height + (card.faceUp ? CARD_PEEK : CARD_PEEK_DOWN),
      0,
    );

  const tallest = Math.max(CARD_HEIGHT, ...deal.tableau.map(pileHeight));

  return (
    <View style={styles.board}>
      <View style={styles.topRow}>
        <View style={styles.slot}>
          <PlayingCard
            card={deal.stock.length ? { rank: 0, suit: 'S', faceUp: false } : null}
            placeholder={deal.stock.length ? undefined : '↻'}
          />
          <Text variant="micro" tone="muted">
            {deal.stock.length}
          </Text>
        </View>

        <View style={styles.slot}>
          <PlayingCard card={wasteTop} />
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
              />
              <Text variant="micro" tone="muted">
                {rank ? RANKS[rank] : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.tableau, { height: tallest + 8 }]}>
          {deal.tableau.map((pile, index) => (
            <View key={index} style={styles.pile}>
              {pile.length === 0 ? (
                <PlayingCard card={null} />
              ) : (
                pile.map((card, position) => {
                  const above = pile.slice(0, position);
                  const top = above.reduce(
                    (offset, c) => offset + (c.faceUp ? CARD_PEEK : CARD_PEEK_DOWN),
                    0,
                  );
                  return (
                    <View key={position} style={[styles.stacked, { top }]}>
                      <PlayingCard card={card} />
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
  pile: { width: CARD_WIDTH },
  stacked: { position: 'absolute', left: 0 },
  pileLabel: { position: 'absolute', alignSelf: 'center' },
  rule: { height: StyleSheet.hairlineWidth, marginTop: 4 },
});
