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
    console.log('[WebSocket.fetchWebSocketKey] 쿼리 시작...');
    const { data, error } = await supabase
      .from('websocket_keys')
      .select('id, approval_key, issued_at, expires_at')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log('[WebSocket.fetchWebSocketKey] 쿼리 완료:', { data, error });

    if (error) {
      console.error('[WebSocket.fetchWebSocketKey] 에러:', error);
      return { data: null, error };
    }
    return { data: data ?? null, error: null };
  } catch (e) {
    console.error('[WebSocket.fetchWebSocketKey] 예외:', e.message);
    return { data: null, error: { message: e.message } };
  }
}

/**
 * WebSocket 키 저장 (발급 후 Supabase에 저장)
 * @param {string} approval_key - KIS 웹소켓 접속키
 * @param {number} expiryDays - 유효기간 (기본값 365일)
 * @returns {{ data: object|null, error: object|null }}
 */
/**
 * KIS 자격증명을 Supabase에 저장 (서버 자동매매용)
 * 최신 1건을 upsert 형태로 관리 — 단일 사용자 환경 가정
 * @param {object} cred - { accountNo, appkey, appsecret }
 * @returns {{ data: object|null, error: object|null }}
 */
export async function saveKisCredentials({ accountNo, appkey, appsecret }) {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('kis_credentials')
      .insert({
        account_no: accountNo,
        appkey,
        appsecret,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

export async function saveWebSocketKey(approval_key, expiryDays = 365) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

    // user_id는 nullable이므로 NULL로 저장 가능
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
    console.log('[WebSocket] 키 관리 시작...');

    // 1. 기존 키 확인
    const { data: existingKey, error: fetchError } = await fetchWebSocketKey();
    console.log('[WebSocket] 기존 키 조회:', { existingKey, fetchError });

    if (fetchError) {
      console.error('[WebSocket] 기존 키 조회 실패:', fetchError);
      return {
        success: false,
        error: { message: `키 조회 실패: ${fetchError.message || '알 수 없는 오류'}` },
      };
    }

    if (existingKey) {
      const expiresAt = new Date(existingKey.expires_at);
      const now = new Date();

      console.log('[WebSocket] 키 유효기간 확인:', {
        approval_key: existingKey.approval_key?.substring(0, 20) + '...',
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isValid: expiresAt > now,
      });

      // 유효한 키가 있으면 그대로 사용
      if (expiresAt > now) {
        console.log('[WebSocket] 기존 유효한 키 사용 ✓');
        return { success: true, error: null };
      } else {
        console.log('[WebSocket] 기존 키 만료됨, 새로 발급 필요');
      }
    } else {
      console.log('[WebSocket] 기존 키 없음, 새로 발급 필요');
    }

    // 2. 새로운 키 발급
    console.log('[WebSocket] 새로운 키 발급 시작...');
    const { approval_key, error: issueError } = await issueWebSocketKey(appkey, appsecret);
    console.log('[WebSocket] 키 발급 결과:', { approval_key: approval_key ? '✓' : '✗', issueError });

    if (issueError || !approval_key) {
      console.error('[WebSocket] 키 발급 실패:', issueError);
      return {
        success: false,
        error: issueError || { message: 'WebSocket 키 발급 실패' },
      };
    }

    // 3. 발급된 키 저장
    console.log('[WebSocket] 키 저장 시작...');
    const { data, error: saveError } = await saveWebSocketKey(approval_key, 365);
    console.log('[WebSocket] 키 저장 결과:', { data, saveError });

    if (saveError) {
      console.error('[WebSocket] 키 저장 실패:', saveError);
      return {
        success: false,
        error: saveError,
      };
    }

    console.log('[WebSocket] 키 관리 완료 ✓');
    return { success: true, error: null };
  } catch (e) {
    console.error('[WebSocket] 키 관리 중 오류:', e);
    return {
      success: false,
      error: { message: e.message || 'WebSocket 키 관리 중 오류 발생' },
    };
  }
}
