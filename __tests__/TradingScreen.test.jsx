/**
 * TradingScreen 통합 테스트
 * TDD: 이슈 #15 #16 #17 #18
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// console.error 억제
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});

// ── Mock tradingApi ──────────────────────────────────────────────────────────

jest.mock('../lib/tradingApi', () => ({
  fetchSettings: jest.fn(),
  createSetting: jest.fn(),
  updateSetting: jest.fn(),
  deleteSetting: jest.fn(),
  toggleSetting: jest.fn(),
  fetchTradeLogs: jest.fn(),
}));

// ── Mock AsyncStorage ────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
}));

// ── Mock expo-router ─────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

const {
  fetchSettings,
  createSetting,
  deleteSetting,
  toggleSetting,
  fetchTradeLogs,
} = require('../lib/tradingApi');

function setupDefaultMocks() {
  fetchSettings.mockResolvedValue({ data: [], error: null });
  fetchTradeLogs.mockResolvedValue({ data: [], error: null });
  createSetting.mockResolvedValue({ data: { id: 'new-1' }, error: null });
  deleteSetting.mockResolvedValue({ error: null });
  toggleSetting.mockResolvedValue({ data: { id: 'setting-1', is_active: true }, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

// ── 탭 렌더링 ────────────────────────────────────────────────────────────────

describe('TradingScreen - 탭 렌더링', () => {
  it('설정목록 탭이 표시된다', () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);
    expect(getByTestId('tab-settings')).toBeTruthy();
  });

  it('KIS 자격증명 탭이 표시된다', () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);
    expect(getByTestId('tab-credentials')).toBeTruthy();
  });

  it('매매조건 탭이 표시된다', () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);
    expect(getByTestId('tab-condition')).toBeTruthy();
  });

  it('실행로그 탭이 표시된다', () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);
    expect(getByTestId('tab-logs')).toBeTruthy();
  });

  it('기본 활성 탭은 설정목록이다', () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);
    expect(getByTestId('settings-panel')).toBeTruthy();
  });
});

// ── 설정목록 탭 ──────────────────────────────────────────────────────────────

describe('TradingScreen - 설정목록 탭 (이슈 #15)', () => {
  it('로딩 중 ActivityIndicator 표시', async () => {
    let resolveSettings;
    fetchSettings.mockImplementationOnce(
      () => new Promise((res) => { resolveSettings = res; })
    );
    fetchTradeLogs.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('settings-loading')).toBeTruthy();
    });

    resolveSettings({ data: [], error: null });
  });

  it('설정 없을 때 빈 상태 안내 텍스트 표시', async () => {
    fetchSettings.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('settings-empty')).toBeTruthy();
    });
  });

  it('설정 목록이 표시된다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 1000,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('setting-item-setting-1')).toBeTruthy();
    });
  });

  it('설정 종목명이 표시된다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 1000,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByText } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByText('AAPL')).toBeTruthy();
    });
  });

  it('활성 설정에 활성 Badge가 표시된다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 1000,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('badge-active-setting-1')).toBeTruthy();
    });
  });

  it('토글 Switch가 표시된다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: false,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 100,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('toggle-setting-1')).toBeTruthy();
    });
  });

  it('삭제 버튼이 표시된다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 100,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-setting-setting-1')).toBeTruthy();
    });
  });

  it('삭제 버튼 클릭 시 Alert이 표시된다', async () => {
    const ReactNative = require('react-native');
    const alertSpy = jest.spyOn(ReactNative.Alert, 'alert').mockImplementation(() => {});

    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 100,
        created_at: '2026-03-01T00:00:00Z',
      },
    ];
    fetchSettings.mockResolvedValue({ data: mockSettings, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-setting-setting-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-setting-setting-1'));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('설정 추가 버튼이 표시된다', async () => {
    fetchSettings.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('add-setting-button')).toBeTruthy();
    });
  });

  it('설정 추가 버튼 클릭 시 폼이 표시된다', async () => {
    fetchSettings.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('add-setting-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('add-setting-button'));

    await waitFor(() => {
      expect(getByTestId('setting-form')).toBeTruthy();
    });
  });

  it('폼에서 종목 입력 후 저장하면 createSetting이 호출된다', async () => {
    fetchSettings.mockResolvedValue({ data: [], error: null });
    createSetting.mockResolvedValue({ data: { id: 'new-1', ticker: 'TSLA' }, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('add-setting-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('add-setting-button'));

    await waitFor(() => {
      expect(getByTestId('form-ticker-input')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('form-ticker-input'), 'TSLA');

    await act(async () => {
      fireEvent.press(getByTestId('form-submit-button'));
    });

    expect(createSetting).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'TSLA' })
    );
  });

  it('에러 시 에러 컨테이너 표시', async () => {
    fetchSettings.mockResolvedValue({ data: null, error: { message: '조회 오류' } });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const { getByTestId } = render(<TradingScreen />);

    await waitFor(() => {
      expect(getByTestId('settings-error')).toBeTruthy();
    });
  });
});

// ── KIS 자격증명 탭 (이슈 #16) ────────────────────────────────────────────────

describe('TradingScreen - KIS 자격증명 탭 (이슈 #16)', () => {
  const switchToCredentials = async (utils) => {
    await act(async () => {
      fireEvent.press(utils.getByTestId('tab-credentials'));
    });
  };

  it('자격증명 탭으로 전환되면 credentials-panel이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    expect(utils.getByTestId('credentials-panel')).toBeTruthy();
  });

  it('App Key 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    expect(utils.getByTestId('credentials-app-key')).toBeTruthy();
  });

  it('App Secret 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    expect(utils.getByTestId('credentials-app-secret')).toBeTruthy();
  });

  it('계좌번호 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    expect(utils.getByTestId('credentials-account-no')).toBeTruthy();
  });

  it('저장 버튼이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    expect(utils.getByTestId('credentials-save-button')).toBeTruthy();
  });

  it('값 입력 후 저장 시 AsyncStorage.setItem이 호출된다', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(null);

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    fireEvent.changeText(utils.getByTestId('credentials-app-key'), 'my-app-key');
    fireEvent.changeText(utils.getByTestId('credentials-app-secret'), 'my-app-secret');
    fireEvent.changeText(utils.getByTestId('credentials-account-no'), '12345678-01');

    await act(async () => {
      fireEvent.press(utils.getByTestId('credentials-save-button'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'kis_credentials',
      expect.stringContaining('my-app-key')
    );
  });

  it('빈 값 입력 시 에러 메시지가 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('credentials-save-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('credentials-error')).toBeTruthy();
    });
  });

  it('저장 완료 시 성공 메시지가 표시된다', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.setItem.mockResolvedValue(null);

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    fireEvent.changeText(utils.getByTestId('credentials-app-key'), 'key');
    fireEvent.changeText(utils.getByTestId('credentials-app-secret'), 'secret');
    fireEvent.changeText(utils.getByTestId('credentials-account-no'), '12345678-01');

    await act(async () => {
      fireEvent.press(utils.getByTestId('credentials-save-button'));
    });

    await waitFor(() => {
      expect(utils.getByTestId('credentials-saved')).toBeTruthy();
    });
  });

  it('저장된 자격증명을 불러와서 입력창에 표시한다', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(
      JSON.stringify({
        app_key: 'stored-key',
        app_secret: 'stored-secret',
        account_no: '99999999-01',
      })
    );

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCredentials(utils);

    await waitFor(() => {
      expect(utils.getByDisplayValue('stored-key')).toBeTruthy();
    });
  });
});

// ── 매매조건 탭 (이슈 #17) ──────────────────────────────────────────────────

describe('TradingScreen - 매매조건 탭 (이슈 #17)', () => {
  const switchToCondition = async (utils) => {
    await act(async () => {
      fireEvent.press(utils.getByTestId('tab-condition'));
    });
  };

  it('매매조건 탭으로 전환되면 condition-panel이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('condition-panel')).toBeTruthy();
  });

  it('실행 시간 선택 카드가 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('execution-time-card')).toBeTruthy();
  });

  it('장 시작 실행 시간 옵션이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('execution-time-market_open')).toBeTruthy();
  });

  it('장 마감 실행 시간 옵션이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('execution-time-market_close')).toBeTruthy();
  });

  it('실행 시간 선택 클릭이 동작한다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('execution-time-market_close_1h'));
    });

    // 클릭 후 오류 없이 동작 확인
    expect(utils.getByTestId('execution-time-market_close_1h')).toBeTruthy();
  });

  it('매수 임계값 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('buy-condition-input')).toBeTruthy();
  });

  it('매도 임계값 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('sell-condition-input')).toBeTruthy();
  });

  it('매매 금액 입력창이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('amount-input')).toBeTruthy();
  });

  it('저장 버튼이 표시된다', async () => {
    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    expect(utils.getByTestId('condition-save-button')).toBeTruthy();
  });

  it('저장 클릭 시 AsyncStorage.setItem이 호출된다', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToCondition(utils);

    await act(async () => {
      fireEvent.press(utils.getByTestId('condition-save-button'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'trading_condition',
      expect.any(String)
    );
  });
});

// ── 실행로그 탭 (이슈 #18) ──────────────────────────────────────────────────

describe('TradingScreen - 실행로그 탭 (이슈 #18)', () => {
  const switchToLogs = async (utils) => {
    await act(async () => {
      fireEvent.press(utils.getByTestId('tab-logs'));
    });
  };

  it('실행로그 탭으로 전환되면 logs-panel이 표시된다', async () => {
    fetchTradeLogs.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    expect(utils.getByTestId('logs-panel')).toBeTruthy();
  });

  it('로그 없을 때 빈 상태 표시', async () => {
    fetchTradeLogs.mockResolvedValue({ data: [], error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('logs-empty')).toBeTruthy();
    });
  });

  it('로그 목록이 표시된다', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        setting_id: 'setting-1',
        action: 'BUY',
        ticker: 'AAPL',
        price: 180.5,
        amount: 500,
        status: 'success',
        message: '매수 완료',
        created_at: '2026-03-24T10:00:00Z',
      },
    ];
    fetchTradeLogs.mockResolvedValue({ data: mockLogs, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('log-item-log-1')).toBeTruthy();
    });
  });

  it('로그 상태 Badge가 표시된다', async () => {
    const mockLogs = [
      {
        id: 'log-2',
        setting_id: 'setting-1',
        action: 'SELL',
        ticker: 'MSFT',
        price: 400,
        amount: 400,
        status: 'success',
        message: '매도 완료',
        created_at: '2026-03-23T10:00:00Z',
      },
    ];
    fetchTradeLogs.mockResolvedValue({ data: mockLogs, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('log-status-log-2')).toBeTruthy();
    });
  });

  it('BUY 액션 Badge가 표시된다', async () => {
    const mockLogs = [
      {
        id: 'log-3',
        setting_id: 'setting-1',
        action: 'BUY',
        ticker: 'TSLA',
        price: 250,
        amount: 250,
        status: 'success',
        message: '매수 완료',
        created_at: '2026-03-22T10:00:00Z',
      },
    ];
    fetchTradeLogs.mockResolvedValue({ data: mockLogs, error: null });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('log-action-log-3')).toBeTruthy();
    });
  });

  it('로그 에러 시 에러 컨테이너 표시', async () => {
    fetchTradeLogs.mockResolvedValue({ data: null, error: { message: '로그 조회 실패' } });

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('logs-error')).toBeTruthy();
    });
  });

  it('로딩 중 ActivityIndicator 표시', async () => {
    let resolveLogs;
    fetchTradeLogs.mockImplementationOnce(
      () => new Promise((res) => { resolveLogs = res; })
    );

    const TradingScreen = require('../app/(tabs)/trading').default;
    const utils = render(<TradingScreen />);

    await switchToLogs(utils);

    await waitFor(() => {
      expect(utils.getByTestId('logs-loading')).toBeTruthy();
    });

    resolveLogs({ data: [], error: null });
  });
});
