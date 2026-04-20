/**
 * 강화학습(PPO) 학습 / 예측 API 클라이언트
 * 백엔드: bitcoin-ai-backend (HuggingFace Space)
 */

const BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';

export const RL_PREDICT_URL    = `${BASE}/v1/rl/predict`;
export const RL_TRAIN_STATUS_URL = `${BASE}/v1/rl/train-status`;

// wss:// 로 변환
export const WS_RL_TRAIN_URL = BASE
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws') + '/ws/rl/train';

/**
 * RL 모델로 종목 예측
 * @param {{ modelId: string, ticker: string, days?: number, stage?: number }} params
 * @returns {{ ticker, latest_signal, latest_action, latest_price, holding, holding_return, predictions }}
 */
export async function predictRl({ modelId, ticker, days = 500, stage = 6 }) {
  const response = await fetch(RL_PREDICT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, ticker, days, stage }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * 현재 RL 학습 상태 폴링
 * @returns {{ status, collect_progress, train_progress, model_name, result, error }}
 */
export async function fetchRlTrainStatus() {
  const response = await fetch(RL_TRAIN_STATUS_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * RL 학습 WebSocket 연결 헬퍼
 *
 * @param {{
 *   group: string,
 *   period: number,
 *   stage: number,
 *   totalTimesteps: number,
 *   modelName?: string,
 *   ticker?: string,
 *   onCollection: (progress: number) => void,
 *   onTraining:   (progress: number, message?: string) => void,
 *   onComplete:   (result: object) => void,
 *   onError:      (message: string) => void,
 * }} options
 * @returns {WebSocket}
 */
export function startRlTrain({
  group,
  period,
  stage,
  totalTimesteps,
  modelName,
  ticker,
  onCollection,
  onTraining,
  onComplete,
  onError,
}) {
  const ws = new WebSocket(WS_RL_TRAIN_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      group,
      period,
      stage,
      totalTimesteps,
      modelName: modelName || `RL_PPO_${group}_s${stage}`,
      ...(ticker ? { ticker } : {}),
    }));
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'collection') onCollection?.(msg.progress);
      else if (msg.type === 'training')  onTraining?.(msg.progress, msg.message);
      else if (msg.type === 'complete')  onComplete?.(msg.result);
      else if (msg.type === 'error')     onError?.(msg.message);
    } catch {
      onError?.('메시지 파싱 오류');
    }
  };

  ws.onerror = () => onError?.('WebSocket 연결 오류');

  return ws;
}
