/**
 * 백엔드 API 클라이언트
 * HuggingFace Spaces: https://younginpiniti-bitcoin-ai-backend.hf.space
 */

export const BACKEND_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';

const SLEEP_THRESHOLD_MS = 3000;

/**
 * 백엔드 헬스체크
 * @returns {{ status: 'online'|'sleeping'|'offline', version?: string, responseTime?: number, error?: string }}
 */
export async function fetchHealth() {
  const controller = new AbortController();
  const startTime = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/`, {
      signal: controller.signal,
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    if (responseTime > SLEEP_THRESHOLD_MS) {
      return {
        status: 'sleeping',
        version: data.version,
        responseTime,
      };
    }

    return {
      status: 'online',
      version: data.version,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'offline',
      error: error.message,
    };
  }
}

/**
 * 자동매매 설정 조회
 * @returns {{ active: boolean, settings: object|null, error?: string }}
 */
export async function fetchAutoTradeSettings() {
  try {
    const response = await fetch(`${BACKEND_URL}/auto-trade/settings`, {
      method: 'GET',
    });

    if (!response.ok) {
      return {
        active: false,
        settings: null,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      active: false,
      settings: null,
      error: error.message,
    };
  }
}
