/**
 * S&P 500 일별 영향도 분석 API
 * Supabase sp500_daily_impact, sp500_daily_analysis_meta 테이블 조회
 */
import { supabase } from './supabaseClient';

const TABLE_IMPACT = 'sp500_daily_impact';
const TABLE_META = 'sp500_daily_analysis_meta';

/**
 * 특정 날짜의 데이터가 있는 날짜 목록 조회 (달력 점 표시용)
 * @param {number} days - 최근 N일
 * @returns {{ data: string[]|null, error: object|null }}
 */
export async function fetchSp500ActiveDates(days = 60) {
  try {
    const { data, error } = await supabase
      .from(TABLE_META)
      .select('analysis_date')
      .order('analysis_date', { ascending: false })
      .limit(days);

    if (error) return { data: null, error };
    return { data: (data || []).map((r) => r.analysis_date), error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 날짜의 S&P 500 분석 메타(요약) 조회
 * @param {string} date - YYYY-MM-DD
 * @returns {{ data: object|null, error: object|null }}
 */
export async function fetchSp500MetaByDate(date) {
  try {
    const { data, error } = await supabase
      .from(TABLE_META)
      .select('*')
      .eq('analysis_date', date)
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: data ?? null, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 날짜의 Bullish/Bearish 종목 목록 조회 (confidence 내림차순)
 * 모델 예측 신호 포함
 */
export async function fetchSp500ActionableByDate(date) {
  try {
    const { data, error } = await supabase
      .from(TABLE_IMPACT)
      .select(`
        ticker, name, sector, direction, confidence, reason, exchange,
        xgb_prob, xgb_model_id,
        rl_signal, rl_model_id,
        timesfm_signal, chronos_signal, moirai_signal,
        rumors_signal, rumors_confidence, rumors_post_count, rumors_reason
      `)
      .eq('analysis_date', date)
      .in('direction', ['bullish', 'bearish'])
      .order('confidence', { ascending: false });

    if (error) return { data: null, error };
    return { data: data || [], error: null };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

/**
 * 특정 날짜의 시간대별 종목 목록 조회
 * 백엔드 /sp500/impact-hourly 엔드포인트 사용
 * @param {string} date - YYYY-MM-DD
 * @returns {{ times: string[], by_time: {[time]: object[]}, error?: object|null }}
 */
export async function fetchSp500HourlyByDate(date) {
  try {
    const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    const url = `${apiBase}/sp500/impact-hourly?date=${date}`;
    const response = await fetch(url);

    if (!response.ok) {
      return { times: [], by_time: {}, error: { status: response.status } };
    }

    const json = await response.json();
    const { data } = json;

    if (!data || !data.times) {
      return { times: [], by_time: {}, error: null };
    }

    // by_time의 각 시간대에서 bullish/bearish만 필터링
    const filtered_by_time = {};
    for (const [time, stocks] of Object.entries(data.by_time)) {
      filtered_by_time[time] = (stocks || []).filter(
        (s) => s.direction === 'bullish' || s.direction === 'bearish'
      );
    }

    return {
      times: data.times,
      by_time: filtered_by_time,
      error: null,
    };
  } catch (e) {
    return { times: [], by_time: {}, error: { message: e.message } };
  }
}
