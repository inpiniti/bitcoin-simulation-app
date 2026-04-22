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
        ticker, name, sector, direction, confidence, reason,
        xgb_prob, xgb_model_id,
        rl_signal, rl_model_id,
        timesfm_signal, chronos_signal, moirai_signal
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
