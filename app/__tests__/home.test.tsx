import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import Home from "../index";
import { testRouter } from "./testRouter";
import { renderWithProviders } from "@/components/__tests__/renderWithProviders";
import { t } from "@/i18n";
import { dayNumber } from "@/logic/klondike";
import { FREE_ARCHIVE_DAYS, useGameStore } from "@/store/useGameStore";
import { useAdsConsentStore } from "@/store/useAdsConsentStore";
import { usePremiumStore } from "@/store/usePremiumStore";

const TODAY = dayNumber(Date.now());

// A daily deal the solver has actually won is deterministic but not otherwise
// controllable from a test -- it doesn't guarantee any particular card sits on
// top of the waste. The double-tap-to-foundation feature is exercised against a
// fixed deal with an ace on the waste, which is foundable the moment it's dealt.
jest.mock("@/logic/klondike", () => {
  const actual = jest.requireActual("@/logic/klondike");
  return {
    ...actual,
    dailyDeal: jest.fn(() => ({
      tableau: Array.from({ length: 7 }, () => []),
      stock: [],
      waste: [{ rank: 1, suit: "S", faceUp: true }],
      foundations: { S: 0, H: 0, D: 0, C: 0 },
    })),
  };
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({
    consent: { canServeAds: true, offerPrivacyOptions: false },
  });
  useGameStore.setState({ results: [], undosUsed: 0 });
});

describe("Home", () => {
  it("renders the app name and routes to settings", async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t("appName"))).toBeTruthy();
    await fireEvent.press(getByLabelText(t("settingsTitle")));
    expect(testRouter.push).toHaveBeenCalledWith("/settings");
  });

  it("shows a banner to a free user and none to a premium one", async () => {
    const free = await renderWithProviders(<Home />);
    expect(free.queryByTestId("banner-ad")).not.toBeNull();
    usePremiumStore.setState({ isPremium: true });
    const paid = await renderWithProviders(<Home />);
    expect(paid.queryByTestId("banner-ad")).toBeNull();
  });

  // The tagline is a claim, so the screen states it and a test holds it there.
  it("tells the player every deal is solvable", async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t("guaranteedWinnable"))).toBeTruthy();
  });

  it("offers a deal, and shows playable moves once dealt", async () => {
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("dealCta")));
    await waitFor(() => expect(queryByText(t("dealCta"))).toBeNull());
    expect(getByText(t("drawCta"))).toBeTruthy();
  });

  it("shows a streak once days have been won", async () => {
    useGameStore.setState({
      results: [
        { day: TODAY - 1, moves: 100, ms: 1000 },
        { day: TODAY, moves: 90, ms: 900 },
      ],
      undosUsed: 0,
    });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t("streakLabel", { n: 2 }))).toBeTruthy();
  });

  it("tells a free player the undo limit", async () => {
    const { getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("dealCta")));
    await waitFor(() =>
      expect(getByText(t("undoLocked", { n: 3 }))).toBeTruthy(),
    );
  });

  // The paid claim: the archive beyond the free window.
  it("sends a free player opening an old deal to the paywall", async () => {
    const { getAllByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getAllByLabelText(t("dayLocked"))[0]!);
    expect(testRouter.push).toHaveBeenCalledWith("/paywall");
  });

  it("tells a free player how far back the archive goes", async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(
      getByText(t("archiveLocked", { n: FREE_ARCHIVE_DAYS })),
    ).toBeTruthy();
  });

  it("renders a locked day label as readable text, not a dimmed placeholder", async () => {
    const { getAllByLabelText } = await renderWithProviders(<Home />);
    expect(getAllByLabelText(t("dayLocked")).length).toBeGreaterThan(0);
  });

  // The reported bug: no way to send a card to its foundation except reading
  // through the move list for the one matching it, one at a time.
  it("sends a card to its foundation on a double tap, when that move is legal", async () => {
    const { getByText, getByTestId, getByLabelText } =
      await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("dealCta")));
    await waitFor(() => expect(getByTestId("waste-card")).toBeTruthy());

    expect(getByLabelText(t("undoCta")).props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.press(getByTestId("waste-card"));
    await fireEvent.press(getByTestId("waste-card"));

    await waitFor(() =>
      expect(
        getByLabelText(t("undoCta")).props.accessibilityState.disabled,
      ).toBe(false),
    );
  });

  // "Users have no idea how to play it. Needs instructions or how to play" --
  // there was nowhere on the screen that said what a Klondike deal even was.
  it("shows how-to-play instructions on request, and hides them again", async () => {
    const { getByLabelText, getByText, queryByText } =
      await renderWithProviders(<Home />);
    expect(queryByText(t("howToPlayBody"))).toBeNull();

    await fireEvent.press(getByLabelText(t("howToPlayTitle")));
    expect(getByText(t("howToPlayBody"))).toBeTruthy();

    await fireEvent.press(getByLabelText(t("howToPlayTitle")));
    expect(queryByText(t("howToPlayBody"))).toBeNull();
  });

  it("does nothing on a single tap of the waste card", async () => {
    const { getByText, getByTestId, getByLabelText } =
      await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t("dealCta")));
    await waitFor(() => expect(getByTestId("waste-card")).toBeTruthy());

    await fireEvent.press(getByTestId("waste-card"));

    expect(getByLabelText(t("undoCta")).props.accessibilityState.disabled).toBe(
      true,
    );
  });
});
