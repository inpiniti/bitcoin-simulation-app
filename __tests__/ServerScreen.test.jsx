/**
 * ServerScreen 컴포넌트 테스트
 * TDD: 테스트 먼저 작성
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Mock backendApi
jest.mock('../lib/backendApi', () => ({
  fetchHealth: jest.fn(),
  fetchAutoTradeSettings: jest.fn(),
}));

// Mock supabaseClient
jest.mock('../lib/supabaseClient', () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

  return {
    supabase: {
      from: jest.fn(() => ({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      })),
    },
    default: {
      from: jest.fn(() => ({
        select: mockSelect,
        order: mockOrder,
        limit: mockLimit,
      })),
    },
  };
});

// jest.useFakeTimers conflicts with waitFor - use real timers
beforeEach(() => {
  jest.clearAllMocks();
});

const { fetchHealth, fetchAutoTradeSettings } = require('../lib/backendApi');

describe('ServerScreen - 헬스체크 상태', () => {
  it('온라인 상태(200 ok) 시 🟢 온라인 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'online',
      version: '2.0.0',
      responseTime: 500,
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('health-status-online')).toBeTruthy();
    });
  });

  it('슬립 상태 시 🟡 슬립 상태 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'sleeping',
      version: '2.0.0',
      responseTime: 4000,
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('health-status-sleeping')).toBeTruthy();
    });
  });

  it('오프라인 상태 시 🔴 오프라인 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'offline',
      error: 'Network Error',
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('health-status-offline')).toBeTruthy();
    });
  });

  it('온라인 상태 시 버전 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'online',
      version: '2.0.0',
      responseTime: 300,
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByText } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByText(/2\.0\.0/)).toBeTruthy();
    });
  });

  it('슬립/오프라인 시 웨이크업 버튼 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'offline',
      error: 'Network Error',
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('wakeup-button')).toBeTruthy();
    });
  });

  it('온라인 시 웨이크업 버튼 비활성화', async () => {
    fetchHealth.mockResolvedValue({
      status: 'online',
      version: '2.0.0',
      responseTime: 300,
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      const btn = getByTestId('wakeup-button');
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('웨이크업 버튼 클릭 시 fetchHealth 재호출', async () => {
    fetchHealth.mockResolvedValue({
      status: 'offline',
      error: 'Network Error',
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('wakeup-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('wakeup-button'));
    await waitFor(() => {
      expect(fetchHealth).toHaveBeenCalledTimes(2);
    });
  });

  it('마지막 확인 시간 표시', async () => {
    fetchHealth.mockResolvedValue({
      status: 'online',
      version: '2.0.0',
      responseTime: 300,
    });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('last-checked-time')).toBeTruthy();
    });
  });
});

describe('ServerScreen - 자동매매 설정', () => {
  it('활성 설정 있을 때 설정 정보 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({
      active: true,
      settings: {
        ai_model_key: 'model-uuid-123',
        execution_time: 'market_close_1h',
        buy_condition: 70,
        sell_condition: 65,
        is_active: true,
        trade_enabled: false,
      },
    });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByText } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByText('model-uuid-123')).toBeTruthy();
    });
  });

  it('execution_time 한글 레이블 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({
      active: true,
      settings: {
        ai_model_key: 'model-uuid-123',
        execution_time: 'market_close_1h',
        buy_condition: 70,
        sell_condition: 65,
        is_active: true,
        trade_enabled: false,
      },
    });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByText } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByText('장 마감 1시간 전 (15:00 ET)')).toBeTruthy();
    });
  });

  it('is_active 배지 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({
      active: true,
      settings: {
        ai_model_key: 'model-uuid',
        execution_time: 'market_open',
        buy_condition: 70,
        sell_condition: 65,
        is_active: true,
        trade_enabled: false,
      },
    });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('badge-is-active')).toBeTruthy();
    });
  });

  it('trade_enabled 배지 표시 (모의매매)', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({
      active: true,
      settings: {
        ai_model_key: 'model-uuid',
        execution_time: 'market_open',
        buy_condition: 70,
        sell_condition: 65,
        is_active: true,
        trade_enabled: false,
      },
    });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('badge-trade-enabled')).toBeTruthy();
    });
  });

  it('활성 설정 없을 때 "활성화된 설정이 없습니다" 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByText } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByText('활성화된 설정이 없습니다')).toBeTruthy();
    });
  });
});

describe('ServerScreen - 자동매매 로그', () => {
  it('로그 목록 렌더링', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const mockLogs = [
      {
        id: 'log-1',
        created_at: '2026-03-20T15:00:00Z',
        status: 'success',
        buy_tickers: ['AAPL', 'MSFT'],
        sell_tickers: ['GOOGL'],
        log_summary: '매수 2건, 매도 1건',
        is_test: false,
      },
      {
        id: 'log-2',
        created_at: '2026-03-19T15:00:00Z',
        status: 'error',
        buy_tickers: [],
        sell_tickers: [],
        log_summary: '실행 오류',
        is_test: true,
      },
    ];

    // Re-mock supabase for this test
    const supabaseModule = require('../lib/supabaseClient');
    const mockLimit = jest.fn().mockResolvedValue({ data: mockLogs, error: null });
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('log-item-log-1')).toBeTruthy();
    });
  });

  it('성공 로그에 성공 배지 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const mockLogs = [
      {
        id: 'log-success',
        created_at: '2026-03-20T15:00:00Z',
        status: 'success',
        buy_tickers: ['AAPL'],
        sell_tickers: [],
        log_summary: '매수 1건',
        is_test: false,
      },
    ];

    const supabaseModule = require('../lib/supabaseClient');
    const mockLimit = jest.fn().mockResolvedValue({ data: mockLogs, error: null });
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('log-status-log-success')).toBeTruthy();
    });
  });

  it('로그 없을 때 빈 상태 표시', async () => {
    fetchHealth.mockResolvedValue({ status: 'online', version: '2.0.0', responseTime: 300 });
    fetchAutoTradeSettings.mockResolvedValue({ active: false, settings: null });

    const supabaseModule = require('../lib/supabaseClient');
    const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = jest.fn(() => ({ limit: mockLimit }));
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const ServerScreen = require('../app/(tabs)/server').default;
    const { getByTestId } = render(<ServerScreen />);

    await waitFor(() => {
      expect(getByTestId('logs-empty')).toBeTruthy();
    });
  });
});
