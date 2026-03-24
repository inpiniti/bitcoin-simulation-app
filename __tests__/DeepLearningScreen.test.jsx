/**
 * DeepLearningScreen 컴포넌트 테스트
 * TDD: 테스트 먼저 작성
 * 이슈 #12 (DLModelsTab), #13 (DLPredictionTab), #14 (DLServerTrainingTab)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock supabaseClient
jest.mock('../lib/supabaseClient', () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
  const mockEq = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockDelete = jest.fn().mockReturnThis();

  return {
    supabase: {
      from: jest.fn(() => ({
        select: mockSelect,
        order: mockOrder,
        delete: mockDelete,
        eq: mockEq,
      })),
    },
    default: {
      from: jest.fn(() => ({
        select: mockSelect,
        order: mockOrder,
        delete: mockDelete,
        eq: mockEq,
      })),
    },
  };
});

// Mock xgbApi
jest.mock('../lib/xgbApi', () => ({
  predictXgb: jest.fn(),
  WS_TRAIN_URL: 'wss://younginpiniti-bitcoin-ai-backend.hf.space/ws/train',
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// WebSocket mock
let mockWsInstance;
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.close = jest.fn(() => {
      this.readyState = 3; // CLOSED
    });
    this.send = jest.fn();
    mockWsInstance = this;
  }
}
MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

beforeAll(() => {
  global.WebSocket = MockWebSocket;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockWsInstance = null;
});

// ─── 이슈 #12: DLModelsTab ────────────────────────────────────────────────────

describe('DeepLearningScreen - 탭 렌더링', () => {
  it('모델목록 탭 표시', () => {
    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);
    expect(getByTestId('tab-models')).toBeTruthy();
  });

  it('예측실행 탭 표시', () => {
    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);
    expect(getByTestId('tab-prediction')).toBeTruthy();
  });

  it('서버학습 탭 표시', () => {
    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);
    expect(getByTestId('tab-training')).toBeTruthy();
  });

  it('기본 활성 탭은 모델목록', () => {
    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);
    expect(getByTestId('models-panel')).toBeTruthy();
  });
});

describe('DeepLearningScreen - DLModelsTab', () => {
  it('로딩 중 ActivityIndicator 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    let resolveQuery;
    const pendingQuery = new Promise((res) => { resolveQuery = res; });
    const mockOrder = jest.fn(() => pendingQuery);
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('models-loading')).toBeTruthy();
    });

    resolveQuery({ data: [], error: null });
  });

  it('모델 목록 렌더링', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        accuracy: 0.85,
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('model-item-model-1')).toBeTruthy();
    });
  });

  it('모델 이름 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        accuracy: 0.85,
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByText } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByText('XGB_SP500_v1')).toBeTruthy();
    });
  });

  it('F1 메트릭 배지 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('badge-f1-model-1')).toBeTruthy();
    });
  });

  it('AUC 메트릭 배지 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-2',
        name: 'XGB_QQQ_v1',
        created_at: '2026-03-19T10:00:00Z',
        f1_score: 0.78,
        auc: 0.88,
        precision_score: 0.75,
        recall_score: 0.80,
        is_active: false,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('badge-auc-model-2')).toBeTruthy();
    });
  });

  it('삭제 버튼 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-model-model-1')).toBeTruthy();
    });
  });

  it('모델 없을 때 빈 상태 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('models-empty')).toBeTruthy();
    });
  });

  it('에러 시 에러 메시지 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockOrder = jest.fn().mockResolvedValue({ data: null, error: { message: '조회 실패' } });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('models-error')).toBeTruthy();
    });
  });

  it('삭제 버튼 클릭 시 Alert 표시', async () => {
    const ReactNative = require('react-native');
    const alertSpy = jest.spyOn(ReactNative.Alert, 'alert').mockImplementation(() => {});

    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await waitFor(() => {
      expect(getByTestId('delete-model-model-1')).toBeTruthy();
    });

    fireEvent.press(getByTestId('delete-model-model-1'));
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

// ─── 이슈 #13: DLPredictionTab ────────────────────────────────────────────────

describe('DeepLearningScreen - 예측실행 탭 전환', () => {
  it('예측실행 탭 클릭 시 예측 패널 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('tab-prediction'));
    });

    expect(getByTestId('prediction-panel')).toBeTruthy();
  });
});

describe('DeepLearningScreen - DLPredictionTab', () => {
  const setupPredictionTab = async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockModels = [
      {
        id: 'model-1',
        name: 'XGB_SP500_v1',
        created_at: '2026-03-20T10:00:00Z',
        f1_score: 0.82,
        auc: 0.91,
        precision_score: 0.79,
        recall_score: 0.85,
        is_active: true,
      },
    ];
    const mockOrder = jest.fn().mockResolvedValue({ data: mockModels, error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const utils = render(<DeepLearningScreen />);

    await act(async () => {
      fireEvent.press(utils.getByTestId('tab-prediction'));
    });

    return utils;
  };

  it('종목 입력창 표시', async () => {
    const { getByTestId } = await setupPredictionTab();
    expect(getByTestId('ticker-input')).toBeTruthy();
  });

  it('예측 실행 버튼 표시', async () => {
    const { getByTestId } = await setupPredictionTab();
    expect(getByTestId('predict-button')).toBeTruthy();
  });

  it('예측 실행 시 predictXgb 호출', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    predictXgb.mockResolvedValueOnce({
      buy_probability: 0.7,
      sell_probability: 0.3,
      signal: 'BUY',
    });

    const { getByTestId } = await setupPredictionTab();

    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    await act(async () => {
      fireEvent.press(getByTestId('predict-button'));
    });

    expect(predictXgb).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: 'AAPL' })
    );
  });

  it('BUY 신호 배지 표시', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    predictXgb.mockResolvedValueOnce({
      buy_probability: 0.7,
      sell_probability: 0.3,
      signal: 'BUY',
    });

    const { getByTestId } = await setupPredictionTab();
    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    await act(async () => {
      fireEvent.press(getByTestId('predict-button'));
    });

    await waitFor(() => {
      expect(getByTestId('signal-badge')).toBeTruthy();
    });
  });

  it('매수 확률 프로그레스바 표시', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    predictXgb.mockResolvedValueOnce({
      buy_probability: 0.7,
      sell_probability: 0.3,
      signal: 'BUY',
    });

    const { getByTestId } = await setupPredictionTab();
    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    await act(async () => {
      fireEvent.press(getByTestId('predict-button'));
    });

    await waitFor(() => {
      expect(getByTestId('buy-probability-bar')).toBeTruthy();
    });
  });

  it('매도 확률 프로그레스바 표시', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    predictXgb.mockResolvedValueOnce({
      buy_probability: 0.7,
      sell_probability: 0.3,
      signal: 'BUY',
    });

    const { getByTestId } = await setupPredictionTab();
    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    await act(async () => {
      fireEvent.press(getByTestId('predict-button'));
    });

    await waitFor(() => {
      expect(getByTestId('sell-probability-bar')).toBeTruthy();
    });
  });

  it('buy_threshold 슬라이더 표시', async () => {
    const { getByTestId } = await setupPredictionTab();
    expect(getByTestId('buy-threshold-slider')).toBeTruthy();
  });

  it('sell_threshold 슬라이더 표시', async () => {
    const { getByTestId } = await setupPredictionTab();
    expect(getByTestId('sell-threshold-slider')).toBeTruthy();
  });

  it('예측 실행 중 로딩 표시', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    let resolvePrediction;
    predictXgb.mockImplementationOnce(
      () => new Promise((res) => { resolvePrediction = res; })
    );

    const { getByTestId } = await setupPredictionTab();
    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    act(() => {
      fireEvent.press(getByTestId('predict-button'));
    });

    await waitFor(() => {
      expect(getByTestId('predict-loading')).toBeTruthy();
    });

    await act(async () => {
      resolvePrediction({ buy_probability: 0.7, sell_probability: 0.3, signal: 'BUY' });
    });
  });

  it('예측 에러 시 에러 메시지 표시', async () => {
    const { predictXgb } = require('../lib/xgbApi');
    predictXgb.mockRejectedValueOnce(new Error('예측 실패'));

    const { getByTestId } = await setupPredictionTab();
    fireEvent.changeText(getByTestId('ticker-input'), 'AAPL');

    await act(async () => {
      fireEvent.press(getByTestId('predict-button'));
    });

    await waitFor(() => {
      expect(getByTestId('predict-error')).toBeTruthy();
    });
  });
});

// ─── 이슈 #14: DLServerTrainingTab ───────────────────────────────────────────

describe('DeepLearningScreen - 서버학습 탭 전환', () => {
  it('서버학습 탭 클릭 시 학습 패널 표시', async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const { getByTestId } = render(<DeepLearningScreen />);

    await act(async () => {
      fireEvent.press(getByTestId('tab-training'));
    });

    expect(getByTestId('training-panel')).toBeTruthy();
  });
});

describe('DeepLearningScreen - DLServerTrainingTab', () => {
  const setupTrainingTab = async () => {
    const supabaseModule = require('../lib/supabaseClient');
    const mockOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = jest.fn(() => ({ order: mockOrder }));
    supabaseModule.supabase.from = jest.fn(() => ({ select: mockSelect }));

    const DeepLearningScreen = require('../app/(tabs)/deeplearning').default;
    const utils = render(<DeepLearningScreen />);

    await act(async () => {
      fireEvent.press(utils.getByTestId('tab-training'));
    });

    return utils;
  };

  it('종목그룹 선택 버튼 sp500 표시', async () => {
    const { getByTestId } = await setupTrainingTab();
    expect(getByTestId('group-sp500')).toBeTruthy();
  });

  it('종목그룹 선택 버튼 qqq 표시', async () => {
    const { getByTestId } = await setupTrainingTab();
    expect(getByTestId('group-qqq')).toBeTruthy();
  });

  it('종목그룹 선택 버튼 superinvestor 표시', async () => {
    const { getByTestId } = await setupTrainingTab();
    expect(getByTestId('group-superinvestor')).toBeTruthy();
  });

  it('학습 시작 버튼 표시', async () => {
    const { getByTestId } = await setupTrainingTab();
    expect(getByTestId('start-training-button')).toBeTruthy();
  });

  it('학습 시작 클릭 시 WebSocket 연결 시도', async () => {
    const { getByTestId } = await setupTrainingTab();

    await act(async () => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    expect(mockWsInstance).toBeTruthy();
    expect(mockWsInstance.url).toContain('wss://younginpiniti-bitcoin-ai-backend.hf.space/ws/train');
  });

  it('WebSocket onopen 후 진행률 바 표시', async () => {
    const { getByTestId } = await setupTrainingTab();

    act(() => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    await act(async () => {
      if (mockWsInstance && mockWsInstance.onopen) {
        mockWsInstance.onopen();
      }
    });

    expect(getByTestId('training-progress-bar')).toBeTruthy();
  });

  it('collection 메시지 수신 시 로그에 메시지 표시', async () => {
    const { getByTestId } = await setupTrainingTab();

    act(() => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    await act(async () => {
      if (mockWsInstance) {
        mockWsInstance.onopen && mockWsInstance.onopen();
        mockWsInstance.onmessage && mockWsInstance.onmessage({
          data: JSON.stringify({ type: 'collection', progress: 30, message: '데이터 수집 중...' }),
        });
      }
    });

    await waitFor(() => {
      expect(getByTestId('training-log')).toBeTruthy();
    });
  });

  it('complete 메시지 수신 시 완료 상태 표시', async () => {
    const { getByTestId } = await setupTrainingTab();

    act(() => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    await act(async () => {
      if (mockWsInstance) {
        mockWsInstance.onopen && mockWsInstance.onopen();
        mockWsInstance.onmessage && mockWsInstance.onmessage({
          data: JSON.stringify({ type: 'complete', progress: 100, message: '학습 완료!' }),
        });
      }
    });

    await waitFor(() => {
      expect(getByTestId('training-complete')).toBeTruthy();
    });
  });

  it('error 메시지 수신 시 에러 상태 표시', async () => {
    const { getByTestId } = await setupTrainingTab();

    act(() => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    await act(async () => {
      if (mockWsInstance) {
        mockWsInstance.onopen && mockWsInstance.onopen();
        mockWsInstance.onmessage && mockWsInstance.onmessage({
          data: JSON.stringify({ type: 'error', progress: 0, message: '학습 오류 발생' }),
        });
      }
    });

    await waitFor(() => {
      expect(getByTestId('training-error')).toBeTruthy();
    });
  });

  it('sp500 그룹 선택 시 URL에 쿼리 파라미터 포함', async () => {
    const { getByTestId } = await setupTrainingTab();

    await act(async () => {
      fireEvent.press(getByTestId('group-sp500'));
    });

    await act(async () => {
      fireEvent.press(getByTestId('start-training-button'));
    });

    expect(mockWsInstance.url).toContain('sp500');
  });
});
