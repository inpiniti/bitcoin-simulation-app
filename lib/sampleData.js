export const sampleAccount = {
  deposit: 12345678,
  balance: [
    {
      ticker: '005930',
      name: '삼성전자',
      profit_rate: 3.24,
      avg_price: 72000,
      current_price: 74330,
    },
    {
      ticker: '035720',
      name: '카카오',
      profit_rate: -1.48,
      avg_price: 52800,
      current_price: 52100,
    },
    {
      ticker: 'AAPL',
      name: '애플',
      profit_rate: 5.82,
      avg_price: 211000,
      current_price: 223280,
    },
  ],
};

export const sampleTickers = [
  { ticker: '005930', name: '삼성전자', current_price: 74330, today_rate: 1.23 },
  { ticker: '035720', name: '카카오', current_price: 52100, today_rate: -0.55 },
  { ticker: '000660', name: 'SK하이닉스', current_price: 185400, today_rate: 2.14 },
  { ticker: 'NVDA', name: '엔비디아', current_price: 131220, today_rate: 3.87 },
  { ticker: 'TSLA', name: '테슬라', current_price: 249800, today_rate: -1.12 },
];

export const sampleSettings = [
  {
    id: 'sample-setting-1',
    name: '자동매매_kospi',
    is_active: true,
    execution_time: '09:10',
    buy_condition: 0.7,
    sell_condition: 0.6,
    ai_model_key: 'xgboost',
    ticker_group_key: 'kospi',
    trade_enabled: true,
  },
];

export const sampleTradeLogs = [
  {
    id: 'sample-log-1',
    created_at: '2026-04-10T09:15:00+09:00',
    action: 'buy',
    ticker: '005930',
    price: 74330,
    status: 'success',
    message: '매수 확률 0.82로 주문 후보에 넣었어요.',
  },
  {
    id: 'sample-log-2',
    created_at: '2026-04-10T09:15:00+09:00',
    action: 'sell',
    ticker: 'AAPL',
    price: 223280,
    status: 'success',
    message: '매도 확률 0.63으로 익절 후보에 넣었어요.',
  },
  {
    id: 'sample-log-3',
    created_at: '2026-04-09T09:10:00+09:00',
    action: 'buy',
    ticker: '035720',
    price: 52100,
    status: 'success',
    message: '매수 확률 0.74로 분할 매수를 준비했어요.',
  },
];

export const samplePredictionResults = {
  kospi: [
    { ticker: '005930', name: '삼성전자', signal: 'BUY', buy_probability: 0.82, sell_probability: 0.18 },
    { ticker: '035720', name: '카카오', signal: 'HOLD', buy_probability: 0.51, sell_probability: 0.49 },
    { ticker: '000660', name: 'SK하이닉스', signal: 'SELL', buy_probability: 0.36, sell_probability: 0.64 },
  ],
  kosdaq: [
    { ticker: '091990', name: '셀트리온헬스케어', signal: 'BUY', buy_probability: 0.76, sell_probability: 0.24 },
    { ticker: '293490', name: '카카오게임즈', signal: 'HOLD', buy_probability: 0.54, sell_probability: 0.46 },
    { ticker: '247540', name: '에코프로비엠', signal: 'SELL', buy_probability: 0.39, sell_probability: 0.61 },
  ],
  nasdaq: [
    { ticker: 'AAPL', name: '애플', signal: 'BUY', buy_probability: 0.79, sell_probability: 0.21 },
    { ticker: 'NVDA', name: '엔비디아', signal: 'BUY', buy_probability: 0.86, sell_probability: 0.14 },
    { ticker: 'TSLA', name: '테슬라', signal: 'HOLD', buy_probability: 0.49, sell_probability: 0.51 },
  ],
  nyse: [
    { ticker: 'KO', name: '코카콜라', signal: 'BUY', buy_probability: 0.73, sell_probability: 0.27 },
    { ticker: 'DIS', name: '디즈니', signal: 'HOLD', buy_probability: 0.52, sell_probability: 0.48 },
    { ticker: 'BA', name: '보잉', signal: 'SELL', buy_probability: 0.41, sell_probability: 0.59 },
  ],
};

export const sampleTrainingTimeline = [
  { collect: 18, train: 0, log: '[09:12:01] 데이터를 모으고 있어요.' },
  { collect: 42, train: 0, log: '[09:12:05] 피처를 정리하고 있어요.' },
  { collect: 73, train: 0, log: '[09:12:11] 검증 구간을 나누고 있어요.' },
  { collect: 100, train: 22, log: '[09:12:18] Fold 1/5를 학습하고 있어요.' },
  { collect: 100, train: 48, log: '[09:12:24] Fold 3/5를 학습하고 있어요.' },
  { collect: 100, train: 77, log: '[09:12:31] 피처 중요도를 계산하고 있어요.' },
  { collect: 100, train: 100, log: '[09:12:38] 학습을 마치고 결과를 저장했어요.' },
];