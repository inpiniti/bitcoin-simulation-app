/**
 * xgbApi - XGBoost 예측 API 테스트
 * TDD: 테스트 먼저 작성
 * 이슈 #13 (예측 실행)
 */

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('xgbApi - predictXgb', () => {
  it('모듈이 존재하고 predictXgb 함수를 export한다', () => {
    const { predictXgb } = require('../lib/xgbApi');
    expect(typeof predictXgb).toBe('function');
  });

  it('올바른 엔드포인트에 POST 요청을 보낸다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buy_probability: 0.7, sell_probability: 0.3, signal: 'BUY' }),
    });

    const { predictXgb } = require('../lib/xgbApi');
    await predictXgb({ model_id: 'model-1', ticker: 'AAPL' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://younginpiniti-bitcoin-ai-backend.hf.space/v1/xgb/predict',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ model_id: 'model-1', ticker: 'AAPL' }),
      })
    );
  });

  it('성공 시 { buy_probability, sell_probability, signal } 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buy_probability: 0.65, sell_probability: 0.35, signal: 'BUY' }),
    });

    const { predictXgb } = require('../lib/xgbApi');
    const result = await predictXgb({ model_id: 'model-1', ticker: 'AAPL' });

    expect(result).toEqual({ buy_probability: 0.65, sell_probability: 0.35, signal: 'BUY' });
  });

  it('SELL 신호 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buy_probability: 0.2, sell_probability: 0.8, signal: 'SELL' }),
    });

    const { predictXgb } = require('../lib/xgbApi');
    const result = await predictXgb({ model_id: 'model-1', ticker: 'TSLA' });

    expect(result.signal).toBe('SELL');
  });

  it('HOLD 신호 반환', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ buy_probability: 0.5, sell_probability: 0.5, signal: 'HOLD' }),
    });

    const { predictXgb } = require('../lib/xgbApi');
    const result = await predictXgb({ model_id: 'model-1', ticker: 'MSFT' });

    expect(result.signal).toBe('HOLD');
  });

  it('HTTP 에러 시 에러 throw', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { predictXgb } = require('../lib/xgbApi');
    await expect(predictXgb({ model_id: 'model-1', ticker: 'AAPL' })).rejects.toThrow();
  });

  it('네트워크 에러 시 에러 throw', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    const { predictXgb } = require('../lib/xgbApi');
    await expect(predictXgb({ model_id: 'model-1', ticker: 'AAPL' })).rejects.toThrow('Network Error');
  });
});
