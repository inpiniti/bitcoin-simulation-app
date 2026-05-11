/**
 * 실시간 매매 설정 API
 * Supabase realtime_trading 테이블 CRUD
 * 
 * 테이블 컬럼:
 * id, user_id, ticker, market, gap, base_price, quantity, is_active, created_at, updated_at
 */
import { supabase } from './supabaseClient';

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
