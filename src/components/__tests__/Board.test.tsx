import { fireEvent } from "@testing-library/react-native";
import React from "react";

import { Board } from "../Board";
import { renderWithProviders } from "./renderWithProviders";
import type { Deal } from "@/logic/klondike";

function emptyDeal(): Deal {
  return {
    tableau: Array.from({ length: 7 }, () => []),
    stock: [],
    waste: [],
    foundations: { S: 0, H: 0, D: 0, C: 0 },
  };
}

// A tester asked for exactly this: double-tapping a card should send it to its
// foundation "when applicable". The move list below the board already knows what
// is legal -- this only needs to report which card was double-tapped, not decide
// whether the move is legal itself.
describe("Board double-tap", () => {
  it("reports a double tap on the waste card", async () => {
    const deal = emptyDeal();
    deal.waste = [{ rank: 1, suit: "S", faceUp: true }];
    const onDoubleTapFoundation = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <Board deal={deal} onDoubleTapFoundation={onDoubleTapFoundation} />,
    );
    await fireEvent.press(getByTestId("waste-card"));
    await fireEvent.press(getByTestId("waste-card"));
    expect(onDoubleTapFoundation).toHaveBeenCalledWith({ kind: "waste" });
  });

  it("does not fire on a single tap", async () => {
    const deal = emptyDeal();
    deal.waste = [{ rank: 1, suit: "S", faceUp: true }];
    const onDoubleTapFoundation = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <Board deal={deal} onDoubleTapFoundation={onDoubleTapFoundation} />,
    );
    await fireEvent.press(getByTestId("waste-card"));
    expect(onDoubleTapFoundation).not.toHaveBeenCalled();
  });

  it("reports a double tap on a tableau pile's top card", async () => {
    const deal = emptyDeal();
    deal.tableau[2] = [{ rank: 5, suit: "H", faceUp: true }];
    const onDoubleTapFoundation = jest.fn();
    const { getByTestId } = await renderWithProviders(
      <Board deal={deal} onDoubleTapFoundation={onDoubleTapFoundation} />,
    );
    await fireEvent.press(getByTestId("tableau-2-top"));
    await fireEvent.press(getByTestId("tableau-2-top"));
    expect(onDoubleTapFoundation).toHaveBeenCalledWith({
      kind: "tableau",
      pile: 2,
    });
  });

  it("does not wrap a face-down top card in a tap target", async () => {
    const deal = emptyDeal();
    deal.tableau[2] = [{ rank: 5, suit: "H", faceUp: false }];
    const { queryByTestId } = await renderWithProviders(
      <Board deal={deal} onDoubleTapFoundation={jest.fn()} />,
    );
    expect(queryByTestId("tableau-2-top")).toBeNull();
  });
});
