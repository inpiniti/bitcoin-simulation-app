/**
 * backendApi.js 단위 테스트
 * TDD: 테스트 먼저 작성
 */

const BACKEND_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';

// fetch mock
beforeEach(() => {
  global.fetch = jest.fn();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('fetchHealth', () => {
  it('200 ok 응답 시 status: "online", version 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', version: '2.0.0' }),
    });

    const { fetchHealth } = require('../lib/backendApi');
    const result = await fetchHealth();

    expect(result.status).toBe('online');
    expect(result.version).toBe('2.0.0');
    expect(result.responseTime).toBeDefined();
  });

  it('응답 시간이 3초 초과 시 status: "sleeping" 반환', async () => {
    global.fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ status: 'ok', version: '2.0.0' }),
              }),
            3500
          )
        )
    );

    const { fetchHealth } = require('../lib/backendApi');
    const promise = fetchHealth();

    // 3500ms 경과 시뮬레이션
    jest.advanceTimersByTime(3500);

    const result = await promise;
    expect(result.status).toBe('sleeping');
  });

  it('네트워크 에러 시 status: "offline" 반환', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    const { fetchHealth } = require('../lib/backendApi');
    const result = await fetchHealth();

    expect(result.status).toBe('offline');
    expect(result.error).toBeDefined();
  });

  it('백엔드 URL로 GET / 요청', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', version: '2.0.0' }),
    });

    const { fetchHealth } = require('../lib/backendApi');
    await fetchHealth();

    expect(global.fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/`,
      expect.objectContaining({ signal: expect.anything() })
    );
  });
});

describe('fetchAutoTradeSettings', () => {
  it('활성 설정 있을 때 settings 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        active: true,
        settings: {
          ai_model_key: 'model-uuid',
          execution_time: 'market_close_1h',
          buy_condition: 70,
          sell_condition: 65,
          is_active: true,
          trade_enabled: false,
        },
      }),
    });

    const { fetchAutoTradeSettings } = require('../lib/backendApi');
    const result = await fetchAutoTradeSettings();

    expect(result.active).toBe(true);
    expect(result.settings.ai_model_key).toBe('model-uuid');
    expect(result.settings.execution_time).toBe('market_close_1h');
  });

  it('활성 설정 없을 때 active: false 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ active: false, settings: null }),
    });

    const { fetchAutoTradeSettings } = require('../lib/backendApi');
    const result = await fetchAutoTradeSettings();

    expect(result.active).toBe(false);
    expect(result.settings).toBeNull();
  });

  it('에러 시 error 포함 객체 반환', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed'));

    const { fetchAutoTradeSettings } = require('../lib/backendApi');
    const result = await fetchAutoTradeSettings();

    expect(result.error).toBeDefined();
    expect(result.active).toBe(false);
  });

  it('올바른 URL로 요청', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ active: false, settings: null }),
    });

    const { fetchAutoTradeSettings } = require('../lib/backendApi');
    await fetchAutoTradeSettings();

    expect(global.fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/auto-trade/settings`,
      expect.any(Object)
    );
  });
});
