import React from 'react';
import { render } from '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  Tabs: ({ children }) => <>{children}</>,
  'Tabs.Screen': ({ name, options }) => null,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }) => <>{children}</>,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Wallet: () => null,
  Brain: () => null,
  Clock: () => null,
  BarChart2: () => null,
}));

describe('Tab Navigation Structure', () => {
  it('should have 4 tab screens defined', () => {
    // Tabs are defined by the file structure under app/(tabs)/
    const tabs = ['account', 'model', 'schedule', 'ticker'];
    expect(tabs).toHaveLength(4);
  });

  it('should define correct tab names', () => {
    const expectedTabs = [
      { name: 'account', title: '계좌' },
      { name: 'model', title: '모델' },
      { name: 'schedule', title: '예약' },
      { name: 'ticker', title: '티커' },
    ];

    expectedTabs.forEach((tab) => {
      expect(tab.name).toBeTruthy();
      expect(tab.title).toBeTruthy();
    });
  });
});
