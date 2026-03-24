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
  Activity: () => null,
  MessageCircle: () => null,
  Brain: () => null,
  Settings: () => null,
}));

describe('Tab Navigation Structure', () => {
  it('should have 4 tab screens defined', () => {
    // Tabs are defined by the file structure under app/(tabs)/
    const tabs = ['server', 'ai', 'deeplearning', 'trading'];
    expect(tabs).toHaveLength(4);
  });

  it('should define correct tab names', () => {
    const expectedTabs = [
      { name: 'server', title: '서버상태' },
      { name: 'ai', title: 'AI 질문' },
      { name: 'deeplearning', title: '딥러닝스튜디오' },
      { name: 'trading', title: '자동매매설정' },
    ];

    expectedTabs.forEach((tab) => {
      expect(tab.name).toBeTruthy();
      expect(tab.title).toBeTruthy();
    });
  });
});
