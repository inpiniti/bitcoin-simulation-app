/**
 * XGBoost 예측 API 클라이언트
 * HuggingFace Spaces: https://younginpiniti-bitcoin-ai-backend.hf.space
 */

export const XGB_PREDICT_URL =
  'https://younginpiniti-bitcoin-ai-backend.hf.space/v1/xgb/predict';

export const WS_TRAIN_URL =
  'wss://younginpiniti-bitcoin-ai-backend.hf.space/ws/train';

/**
 * XGBoost 예측 실행
 * @param {{ model_id: string, ticker: string }} params
 * @returns {{ buy_probability: number, sell_probability: number, signal: 'BUY'|'SELL'|'HOLD' }}
 */
export async function predictXgb({ model_id, ticker }) {
  const response = await fetch(XGB_PREDICT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id, ticker }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
