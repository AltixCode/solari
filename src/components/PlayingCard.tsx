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

export interface CardMetrics {
  width: number;
  height: number;
  peek: number;
  peekDown: number;
}

/** The card as drawn for a phone. Every other size is this one scaled. */
export const BASE_CARD_METRICS: CardMetrics = {
  width: CARD_WIDTH,
  height: CARD_HEIGHT,
  peek: CARD_PEEK,
  peekDown: CARD_PEEK_DOWN,
};

/** Seven tableau piles, and the gap between them. */
const PILES = 7;
const PILE_GAP = 6;

/** A card stops growing here. Past it the board stops reading as a card table
 *  and starts reading as a slideshow of enormous cards. */
const MAX_CARD_WIDTH = 96;

/** Room under the tallest pile for the pile number. */
export const LABEL_GUTTER = 18;

/**
 * Card size for the width the board actually has.
 *
 * The card was a fixed 44pt at every size, so on a 13" iPad the seven tableau
 * piles -- the entire game -- occupied roughly a third of the column and the
 * rest of the display was empty around it. The most important thing on the
 * screen was also the smallest, which is the same defect as a document preview
 * fit-to-height in a wide box: content sized without reference to the space it
 * was given.
 *
 * Scaled, not re-laid-out: a playing card has proportions, and a board of
 * stretched cards would be worse than a board of small ones. The baseline is a
 * floor as well as a starting point -- a narrow phone keeps the size it was
 * designed at rather than being squeezed below it, and the horizontal
 * ScrollView that was always there still handles the overflow.
 */
export function cardMetricsForWidth(available: number): CardMetrics {
  const fits = Math.floor((available - PILE_GAP * (PILES - 1)) / PILES);
  const width = Math.min(MAX_CARD_WIDTH, Math.max(BASE_CARD_METRICS.width, fits));
  if (width === BASE_CARD_METRICS.width) return BASE_CARD_METRICS;
  const ratio = width / BASE_CARD_METRICS.width;
  return {
    width,
    height: Math.round(BASE_CARD_METRICS.height * ratio),
    peek: Math.round(BASE_CARD_METRICS.peek * ratio),
    peekDown: Math.round(BASE_CARD_METRICS.peekDown * ratio),
  };
}

/**
 * How tall the tableau box has to be.
 *
 * It was `tallest + 8`, with the pile number positioned at `top: tallest` -- so
 * the label was drawn through the bottom edge and the numbers under the piles
 * came out sliced in half. Visible on solari's iPad frame.
 */
export function tableauHeight(tallest: number): number {
  return tallest + LABEL_GUTTER;
}

interface Props {
  card: Card | null;
  /** Draws an empty outline instead of a card. */
  placeholder?: string;
  /** Size for this board. Defaults to the phone baseline. */
  metrics?: CardMetrics;
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
export const PlayingCard: React.FC<Props> = ({
  card,
  placeholder,
  metrics = BASE_CARD_METRICS,
}) => {
  const { colors } = useTheme();
  const box = {
    width: metrics.width,
    height: metrics.height,
    borderRadius: Math.round(6 * (metrics.width / BASE_CARD_METRICS.width)),
  };
  const pattern = {
    width: metrics.width - 14,
    height: metrics.height - 18,
  };
  // The pip carries the card's colour, so it grows with the card rather than
  // staying a phone-sized glyph on a tablet-sized face.
  const pipSize = Math.round(17 * (metrics.width / BASE_CARD_METRICS.width));

  if (!card) {
    return (
      <View
        style={[
          styles.card,
          box,
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
      <View style={[styles.card, box, { backgroundColor: colors.cardBack, borderColor: colors.cardBorder }]}>
        <View style={[styles.backPattern, pattern, { borderColor: colors.cardBackPattern }]} />
      </View>
    );
  }

  const red = card.suit === 'H' || card.suit === 'D';
  const ink = red ? colors.suitRed : colors.suitBlack;

  return (
    <View style={[styles.card, box, { backgroundColor: colors.cardFace, borderColor: colors.cardBorder }]}>
      <Text variant="micro" style={{ color: ink, fontWeight: '800' }}>
        {RANKS[card.rank]}
      </Text>
      <Text variant="body" style={{ color: ink, fontSize: pipSize, lineHeight: pipSize + 3 }}>
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
