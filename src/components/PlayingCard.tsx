import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Card, Suit } from '@/logic/klondike';

/** Card faces, indexed by rank. Index 0 is unused so rank maps directly. */
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const PIPS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const CARD_WIDTH = 44;
export const CARD_HEIGHT = 62;
/** How much of a stacked card stays visible beneath the one on top of it. */
export const CARD_PEEK = 20;
/** A face-down card shows less, because it carries no information. */
export const CARD_PEEK_DOWN = 12;

interface Props {
  card: Card | null;
  /** Draws an empty outline instead of a card. */
  placeholder?: string;
}

/**
 * One playing card.
 *
 * Solari had a complete and correct Klondike engine -- tableau, stock, waste,
 * foundations, legal moves, a guaranteed-winnable daily deal -- and no way to
 * see any of it. The screen showed four foundation slots as the letters S H D C
 * and a list of sentences ("Pile 6 -> pile 2"), so the app was a solitaire
 * solver you played by reading. Every automated check passed it: right app,
 * frontmost, dark, ad-free, dense enough. Only looking at it showed the problem.
 *
 * Red and black are the actual information a player reads first, so the suit
 * colour is the strongest signal on the card rather than a decoration.
 */
export const PlayingCard: React.FC<Props> = ({ card, placeholder }) => {
  const { colors } = useTheme();

  if (!card) {
    return (
      <View
        style={[
          styles.card,
          styles.empty,
          { borderColor: colors.border, backgroundColor: 'transparent' },
        ]}
      >
        {placeholder ? (
          <Text variant="caption" tone="muted">
            {placeholder}
          </Text>
        ) : null}
      </View>
    );
  }

  if (!card.faceUp) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBack, borderColor: colors.border }]}>
        <View style={[styles.backPattern, { borderColor: colors.cardBackPattern }]} />
      </View>
    );
  }

  const red = card.suit === 'H' || card.suit === 'D';
  const ink = red ? colors.suitRed : colors.suitBlack;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardFace, borderColor: colors.border }]}>
      <Text variant="micro" style={{ color: ink, fontWeight: '800' }}>
        {RANKS[card.rank]}
      </Text>
      <Text variant="body" style={{ color: ink, lineHeight: 20 }}>
        {PIPS[card.suit]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  empty: { borderStyle: 'dashed' },
  backPattern: {
    width: CARD_WIDTH - 14,
    height: CARD_HEIGHT - 18,
    borderRadius: 4,
    borderWidth: 1,
    opacity: 0.55,
  },
});
