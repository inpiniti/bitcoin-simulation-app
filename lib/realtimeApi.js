/**
 * 실시간 매매 설정 API
 * Supabase realtime_trading 테이블 CRUD
 *
 * 테이블 컬럼:
 * id, user_id, ticker, market, gap, gap_qty, base_price, quantity, is_active, created_at, updated_at
 */
import { supabase } from './supabaseClient';
import { getStoredUserId, getStoredJwt } from './authApi';

const TABLE_NAME = 'realtime_trading';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';

// 백엔드 감지 API는 JWT로 사용자를 식별한다 (본인 세션만 제어)
async function authHeaders() {
  const jwt = await getStoredJwt();
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  return headers;
}

/**
 * 서버 실시간 감지 상태 조회
 * @returns {{ data: { running, started_at }|null, error: object|null }}
 */
export async function fetchDetectionStatus() {
  try {
    const resp = await fetch(`${API_BASE}/realtime/detection-status`, {
      headers: await authHeaders(),
    });
    if (!resp.ok) return { data: null, error: { message: `HTTP ${resp.status}` } };
    return { data: await resp.json(), error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 서버 실시간 감지 시작 (websocket_keys에서 키 자동 조회)
 */
export async function startDetection() {
  try {
    const resp = await fetch(`${API_BASE}/realtime/start-detection`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!resp.ok) return { data: null, error: { message: `HTTP ${resp.status}` } };
    return { data: await resp.json(), error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 서버 실시간 감지 중지
 */
export async function stopDetection() {
  try {
    const resp = await fetch(`${API_BASE}/realtime/stop-detection`, {
      method: 'POST',
      headers: await authHeaders(),
    });
    if (!resp.ok) return { data: null, error: { message: `HTTP ${resp.status}` } };
    return { data: await resp.json(), error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 서버에 설정 즉시 재동기화 요청 (추가/삭제/수정/토글 후 호출)
 * 실패해도 무시 — 서버는 15초마다 자동 동기화도 함.
 */
export async function reloadDetectionConfig() {
  try {
    await fetch(`${API_BASE}/realtime/reload-config`, {
      method: 'POST',
      headers: await authHeaders(),
    });
  } catch (_) {
    // 무시
  }
}

/**
 * 실시간 매매 설정 목록 조회
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchRealtimeTrades() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, ticker, market, gap, gap_qty, base_price, quantity, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 실시간 매매 설정 생성
 * @param {object} data - { ticker, market, gap, base_price, quantity }
 * @returns {{ data: object|null, error: object|null }}
 */
export async function createRealtimeTrade(data) {
  try {
    // 소유자 기록 (RLS auth.uid()=user_id 통과에 필수)
    const userId = await getStoredUserId();
    const { data: result, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: userId,
        ticker: data.ticker.toUpperCase(),
        market: data.market.toUpperCase(),
        gap: data.gap || 1,
        gap_qty: data.gap_qty || 1,
        base_price: data.base_price,
        quantity: data.quantity || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }
    // 서버 즉시 동기화
    reloadDetectionConfig();
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 실시간 매매 설정 수정
 * @param {string} id - 설정 ID
 * @param {object} data - 수정할 필드
 * @returns {{ data: object|null, error: object|null }}
 */
export async function updateRealtimeTrade(id, data) {
  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(TABLE_NAME)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }
    // 서버 즉시 동기화 (gap_qty, gap 변경 등 즉시 반영)
    reloadDetectionConfig();
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 실시간 매매 설정 활성화/비활성화
 * @param {string} id - 설정 ID
 * @param {boolean} isActive - 활성화 여부
 * @returns {{ data: object|null, error: object|null }}
 */
export async function toggleRealtimeTrade(id, isActive) {
  return updateRealtimeTrade(id, { is_active: isActive });
}

/**
 * 실시간 매매 설정 삭제
 * @param {string} id - 설정 ID
 * @returns {{ data: object|null, error: object|null }}
 */
export async function deleteRealtimeTrade(id) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }
    // 서버 즉시 동기화 (삭제된 종목 구독 해제 및 캐시 제거)
    reloadDetectionConfig();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 종목의 주문 이력 조회 (최근 N건)
 * @param {string} tradeId - realtime_trading.id
 * @param {number} limit - 최대 건수 (기본 50)
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchRealtimeOrders(tradeId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('realtime_orders')
      .select(
        'id, side, action, quantity, price, base_price_before, base_price_after, price_rate, success, order_no, error_message, created_at'
      )
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

// WebSocket 키 발급/저장과 KIS 자격증명 저장은 백엔드 /auth/kis-login이
// 담당한다 (멀티유저 전환). 앱은 이 테이블들에 직접 접근하지 않는다.
