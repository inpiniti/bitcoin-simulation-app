/**
 * 자동매매 설정 API
 * Supabase automation_settings 테이블 CRUD
 *
 * 테이블 컬럼 (실제 DB 기준):
 * id, name, is_active, execution_time, buy_condition, sell_condition,
 * ai_model_key, ticker_group_key, trade_enabled, created_at, updated_at
 */
import { supabase } from './supabaseClient';

const TABLE_SETTINGS = 'automation_settings';
const TABLE_LOGS = 'automation_trade_logs';

/**
 * 자동매매 실행 로그 조회
 * @param {string} settingId - 설정 ID (null이면 전체)
 * @param {number} limit - 조회 건수 (기본 20)
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchTradeLogs(settingId = null, limit = 20) {
  try {
    let query = supabase
      .from(TABLE_LOGS)
      .select('id, setting_id, action, ticker, price, amount, status, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (settingId) {
      query = query.eq('setting_id', settingId);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 딥러닝 자동매매 실행 로그 조회 (auto_trade_dl_logs)
 * @param {string|null} settingId - automation_settings.id (UUID)
 * @param {number} limit
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchDlTradeLogs(settingId = null, limit = 50) {
  try {
    let query = supabase
      .from('auto_trade_dl_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (settingId) {
      query = query.eq('setting_id', settingId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 날짜의 딥러닝 실행 로그 조회
 * @param {string} tradeDate - YYYY-MM-DD
 * @param {string|null} settingId - automation_settings.id (UUID)
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchDlTradeLogsByDate(tradeDate, settingId = null) {
  try {
    let query = supabase
      .from('auto_trade_dl_logs')
      .select('*')
      .eq('date', tradeDate)
      .order('created_at', { ascending: false });

    if (settingId) {
      query = query.eq('setting_id', settingId);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * TOP10 종목 로그 조회 (top_tickers_log)
 * @param {string|null} settingId - automation_settings.id (UUID)
 * @param {number} limit
 * @param {string|null} settingName - 설정 이름 (settingId가 null인 기존 데이터 호환)
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchTopTickersLog(settingId = null, limit = 30, settingName = null) {
  try {
    let query = supabase
      .from('top_tickers_log')
      .select('*')
      .order('trade_date', { ascending: false })
      .limit(limit);

    if (settingId && settingName) {
      // setting_id가 null인 기존 데이터도 setting_name으로 조회 가능하도록 OR 조건
      query = query.or(`setting_id.eq.${settingId},setting_name.eq.${settingName}`);
    } else if (settingId) {
      query = query.eq('setting_id', settingId);
    } else if (settingName) {
      query = query.eq('setting_name', settingName);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 날짜의 TOP10 종목 조회
 * @param {string} tradeDate - YYYY-MM-DD
 * @param {string|null} settingId - automation_settings.id (UUID)
 * @param {string|null} settingName - 설정 이름 (settingId가 null인 기존 데이터 호환)
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchTopTickersByDate(tradeDate, settingId = null, settingName = null) {
  try {
    let query = supabase
      .from('top_tickers_log')
      .select('*')
      .eq('trade_date', tradeDate)
      .order('created_at', { ascending: false });

    if (settingId && settingName) {
      // setting_id가 null인 기존 데이터도 setting_name으로 조회 가능하도록 OR 조건
      query = query.or(`setting_id.eq.${settingId},setting_name.eq.${settingName}`);
    } else if (settingId) {
      query = query.eq('setting_id', settingId);
    } else if (settingName) {
      query = query.eq('setting_name', settingName);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

const BACKEND_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';

/**
 * 누락된 TimesFM 신호 소급 계산 (backfill)
 * @param {string} recordId - top_tickers_log 레코드 UUID
 * @param {string} tradeDate - 거래일 YYYY-MM-DD
 * @returns {{ data: object|null, error: object|null }}
 */
export async function backfillTimesFM(recordId, tradeDate) {
  try {
    const res = await fetch(`${BACKEND_BASE}/auto-trade/backfill-timesfm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: recordId, trade_date: tradeDate }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { data: null, error: { message: text } };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 지수 데이터 기반 XGBoost + TimesFM 예측
 * @param {string} symbol - 지수 심볼 (e.g. "^GSPC", "QQQ")
 * @param {string} tradeDate - 거래일 YYYY-MM-DD
 * @param {string} modelId - ml_models 테이블 UUID (= ai_model_key)
 * @returns {{ data: { buy_prob: number|null, timesfm_signal: string|null }|null, error: object|null }}
 */
export async function fetchIndexPrediction(symbol, tradeDate, modelId) {
  try {
    const res = await fetch(`${BACKEND_BASE}/auto-trade/predict-index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, trade_date: tradeDate, model_id: modelId }),
    });
    if (!res.ok) return { data: null, error: { message: await res.text() } };
    return { data: await res.json(), error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * AI 모델 목록 조회
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchAiModels() {
  try {
    const { data, error } = await supabase
      .from('ml_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}
