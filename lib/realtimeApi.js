/**
 * 실시간 매매 설정 API
 * Supabase realtime_trading 테이블 CRUD
 *
 * 테이블 컬럼:
 * id, user_id, ticker, market, gap, base_price, quantity, is_active, created_at, updated_at
 */
import { supabase } from './supabaseClient';
import { issueWebSocketKey } from './kisApi';

const TABLE_NAME = 'realtime_trading';

/**
 * 실시간 매매 설정 목록 조회
 * @returns {{ data: Array|null, error: object|null }}
 */
export async function fetchRealtimeTrades() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, ticker, market, gap, base_price, quantity, is_active, created_at, updated_at')
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
    const { data: result, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        ticker: data.ticker.toUpperCase(),
        market: data.market.toUpperCase(),
        gap: data.gap || 1,
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
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 사용자의 최신 WebSocket 키 조회
 * @returns {{ data: object|null, error: object|null }}
 */
export async function fetchWebSocketKey() {
  try {
    const { data, error } = await supabase
      .from('websocket_keys')
      .select('id, approval_key, issued_at, expires_at')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }
    return { data: data ?? null, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * WebSocket 키 저장 (발급 후 Supabase에 저장)
 * @param {string} approval_key - KIS 웹소켓 접속키
 * @param {number} expiryDays - 유효기간 (기본값 365일)
 * @returns {{ data: object|null, error: object|null }}
 */
export async function saveWebSocketKey(approval_key, expiryDays = 365) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('websocket_keys')
      .insert({
        approval_key,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * WebSocket 키를 자동으로 관리 (로그인 후 호출)
 * 기존 유효한 키가 있으면 사용, 없거나 만료되었으면 발급
 * @param {string} appkey - KIS appkey
 * @param {string} appsecret - KIS appsecret
 * @returns {{ success: boolean, error: object|null }}
 */
export async function ensureWebSocketKey(appkey, appsecret) {
  try {
    // 1. 기존 키 확인
    const { data: existingKey, error: fetchError } = await fetchWebSocketKey();

    if (!fetchError && existingKey) {
      const expiresAt = new Date(existingKey.expires_at);
      const now = new Date();

      // 유효한 키가 있으면 그대로 사용
      if (expiresAt > now) {
        return { success: true, error: null };
      }
    }

    // 2. 새로운 키 발급
    const { approval_key, error: issueError } = await issueWebSocketKey(appkey, appsecret);

    if (issueError || !approval_key) {
      return {
        success: false,
        error: issueError || { message: 'WebSocket 키 발급 실패' },
      };
    }

    // 3. 발급된 키 저장
    const { data, error: saveError } = await saveWebSocketKey(approval_key, 365);

    if (saveError) {
      return {
        success: false,
        error: saveError,
      };
    }

    return { success: true, error: null };
  } catch (e) {
    return {
      success: false,
      error: { message: e.message || 'WebSocket 키 관리 중 오류 발생' },
    };
  }
}
