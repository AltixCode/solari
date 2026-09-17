/**
 * A playing card has to be findable on the table.
 *
 * In the light theme the face was #FBFBF9 on a #F7F7F5 background -- 1.04:1,
 * a white card on a white table -- and its edge used the generic `border`
 * token, which was 1.25:1 and so rescued nothing. The dark theme measured
 * 17:1, which is why a device pass in dark mode reported the game as fine.
 * A palette bug that only exists in one theme is invisible to anyone testing
 * in the other.
 *
 * The card's edge is now its own token, held to the WCAG 1.4.11 non-text floor
 * against both the table it sits on and the face it encloses, in both themes.
 */
import { contrastRatio } from '../color';
import { darkPalette, lightPalette } from '../tokens';

describe.each([
  ['light', lightPalette],
  ['dark', darkPalette],
])('%s theme playing cards', (_name, palette) => {
  it('separates the card edge from the table', () => {
    expect(contrastRatio(palette.cardBorder, palette.background)).toBeGreaterThanOrEqual(3);
  });

  it('separates the card edge from the face it encloses', () => {
    expect(contrastRatio(palette.cardBorder, palette.cardFace)).toBeGreaterThanOrEqual(3);
  });

  it('separates the card edge from the back of a face-down card', () => {
    expect(contrastRatio(palette.cardBorder, palette.cardBack)).toBeGreaterThanOrEqual(2.5);
  });

  it('keeps both pip colours legible on the face', () => {
    expect(contrastRatio(palette.suitRed, palette.cardFace)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.suitBlack, palette.cardFace)).toBeGreaterThanOrEqual(4.5);
  });
});
