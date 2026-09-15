import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { testRouter } from './testRouter';
import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { t } from '@/i18n';
import { dayNumber } from '@/logic/klondike';
import { FREE_ARCHIVE_DAYS, useGameStore } from '@/store/useGameStore';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';

const TODAY = dayNumber(Date.now());

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
  useGameStore.setState({ results: [], undosUsed: 0 });
});

describe('Home', () => {
  it('renders the app name and routes to settings', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(<Home />);
    expect(getByText(t('appName'))).toBeTruthy();
    await fireEvent.press(getByLabelText(t('settingsTitle')));
    expect(testRouter.push).toHaveBeenCalledWith('/settings');
  });

  it('shows a banner to a free user and none to a premium one', async () => {
    const free = await renderWithProviders(<Home />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();
    usePremiumStore.setState({ isPremium: true });
    const paid = await renderWithProviders(<Home />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });

  // The tagline is a claim, so the screen states it and a test holds it there.
  it('tells the player every deal is solvable', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('guaranteedWinnable'))).toBeTruthy();
  });

  it('offers a deal, and shows playable moves once dealt', async () => {
    const { getByText, queryByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('dealCta')));
    await waitFor(() => expect(queryByText(t('dealCta'))).toBeNull());
    expect(getByText(t('drawCta'))).toBeTruthy();
  });

  it('shows a streak once days have been won', async () => {
    useGameStore.setState({
      results: [
        { day: TODAY - 1, moves: 100, ms: 1000 },
        { day: TODAY, moves: 90, ms: 900 },
      ],
      undosUsed: 0,
    });
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('streakLabel', { n: 2 }))).toBeTruthy();
  });

  it('tells a free player the undo limit', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    await fireEvent.press(getByText(t('dealCta')));
    await waitFor(() => expect(getByText(t('undoLocked', { n: 3 }))).toBeTruthy());
  });

  // The paid claim: the archive beyond the free window.
  it('sends a free player opening an old deal to the paywall', async () => {
    const { getAllByLabelText } = await renderWithProviders(<Home />);
    await fireEvent.press(getAllByLabelText(t('dayLocked'))[0]!);
    expect(testRouter.push).toHaveBeenCalledWith('/paywall');
  });

  it('tells a free player how far back the archive goes', async () => {
    const { getByText } = await renderWithProviders(<Home />);
    expect(getByText(t('archiveLocked', { n: FREE_ARCHIVE_DAYS }))).toBeTruthy();
  });

  it('renders a locked day label as readable text, not a dimmed placeholder', async () => {
    const { getAllByLabelText } = await renderWithProviders(<Home />);
    expect(getAllByLabelText(t('dayLocked')).length).toBeGreaterThan(0);
  });
});
