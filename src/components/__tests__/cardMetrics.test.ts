import {
  BASE_CARD_METRICS,
  LABEL_GUTTER,
  cardMetricsForWidth,
  tableauHeight,
} from '@/components/PlayingCard';

/**
 * The card was a fixed 44pt wide at every screen size.
 *
 * On a 13" iPad that puts seven tableau piles -- the whole game -- inside about
 * a third of the column, with the rest of a 1032pt display empty around it. The
 * most important element on the screen was also the smallest. Photographed on
 * solari's iPad listing frame, which is why it was not uploaded.
 */
describe('cardMetricsForWidth', () => {
  // Written first as "a phone stays exactly at the baseline", which the
  // implementation failed at 360pt by returning 46. The test was wrong, not the
  // code: 44 is a floor, not a target, and a phone with room for 46 should use
  // it. What actually matters is that a phone is never squeezed BELOW the size
  // the card was designed at, and that it is not blown up either.
  it('keeps a phone at or just above the baseline', () => {
    const phone = cardMetricsForWidth(360);
    expect(phone.width).toBeGreaterThanOrEqual(BASE_CARD_METRICS.width);
    expect(phone.width).toBeLessThan(BASE_CARD_METRICS.width * 1.2);
  });

  it('never shrinks below the baseline, however little width it is given', () => {
    expect(cardMetricsForWidth(120).width).toBe(BASE_CARD_METRICS.width);
    expect(cardMetricsForWidth(0).width).toBe(BASE_CARD_METRICS.width);
  });

  it('widens the card to use a tablet column', () => {
    const tablet = cardMetricsForWidth(890);
    expect(tablet.width).toBeGreaterThan(BASE_CARD_METRICS.width);
    // Seven piles and six gaps have to fit the width it was given.
    expect(tablet.width * 7 + 6 * 6).toBeLessThanOrEqual(890);
  });

  it('scales height and peek with the width, so a card keeps its proportions', () => {
    const tablet = cardMetricsForWidth(890);
    const ratio = tablet.width / BASE_CARD_METRICS.width;
    expect(tablet.height).toBe(Math.round(BASE_CARD_METRICS.height * ratio));
    expect(tablet.peek).toBe(Math.round(BASE_CARD_METRICS.peek * ratio));
    expect(tablet.peekDown).toBe(Math.round(BASE_CARD_METRICS.peekDown * ratio));
  });

  it('caps the card so a 13" landscape does not draw playing cards the size of a hand', () => {
    expect(cardMetricsForWidth(4000).width).toBe(cardMetricsForWidth(2000).width);
  });
});

/**
 * The pile number sat at `top: tallest` inside a box `tallest + 8` high, so the
 * label was drawn through the bottom edge. Visible on the same frame: the
 * numbers under the tableau are sliced in half.
 */
describe('tableauHeight', () => {
  it('reserves room under the tallest pile for the pile number', () => {
    expect(tableauHeight(300)).toBeGreaterThanOrEqual(300 + LABEL_GUTTER);
  });
});
