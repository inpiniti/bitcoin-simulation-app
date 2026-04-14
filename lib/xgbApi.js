/**
 * XGBoost 예측/학습 API 클라이언트
 * 백엔드: https://younginpiniti-bitcoin-ai-backend.hf.space
 */

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL
  || 'https://younginpiniti-bitcoin-ai-backend.hf.space';

export const XGB_PREDICT_URL = `${BASE}/v1/xgb/predict`;
export const XGB_TRAIN_STATUS_URL = `${BASE}/v1/xgb/train-status`;

// wss:// 로 변환
export const WS_TRAIN_URL = BASE.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws/train';

/**
 * XGBoost 예측 실행
 */
export async function predictXgb({ modelId, ticker }) {
  const response = await fetch(XGB_PREDICT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, ticker }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * 현재 학습 상태 조회 (폴링용)
 * @returns {{ status, collect_progress, train_progress, model_name, result, error }}
 */
export async function fetchTrainStatus() {
  const response = await fetch(XGB_TRAIN_STATUS_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
