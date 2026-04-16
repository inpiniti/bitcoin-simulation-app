/**
 * 시장별 종목 목록 + 시세 조회
 *
 * 데이터 소스:
 *  - 종목 코드 목록: 백엔드 /v1/xgb/group-tickers
 *  - 이름 + 시세:    Yahoo Finance v8/finance/chart (개별 종목 병렬 조회)
 *  - 전체 뷰 기본:   백엔드 /auto-trade/top-tickers (AI 상위 종목)
 *
 * 지수 → 그룹 키 매핑:
 *   KOSPI  → kospi200  (코드에 .KS 접미어)
 *   KOSDAQ → (데이터 없음)
 *   NASDAQ → qqq
 *   NYSE   → sp500
 *   SP500  → sp500
 */

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';
const YF_BASE = 'https://query1.finance.yahoo.com';

export const PAGE_SIZE = 20;

// 지수 키 → 백엔드 그룹 키
const GROUP_MAP = {
  KOSPI: 'kospi200',
  NASDAQ: 'qqq',
  NYSE: 'sp500',
  SP500: 'sp500',
};

// 지수 키 → Yahoo Finance 종목 코드 접미어
const YF_SUFFIX = {
  KOSPI: '.KS',
};

/**
 * 백엔드에서 시장별 종목 코드 목록 조회
 * @param {string} market - 'KOSPI' | 'NASDAQ' | 'NYSE' | 'SP500'
 * @returns {Promise<string[]>} - 종목 코드 배열
 */
export async function fetchGroupTickerList(market) {
  const group = GROUP_MAP[market];
  if (!group) return [];
  const res = await fetch(`${API_BASE}/v1/xgb/group-tickers?group=${group}`);
  if (!res.ok) throw new Error(`그룹 조회 실패: ${res.status}`);
  const data = await res.json();
  return data.tickers || [];
}

/**
 * Yahoo Finance에서 단일 종목의 이름 + 현재가 + 등락률 조회
 * @param {string} ticker    - 원본 종목 코드
 * @param {string} [market]  - 지수 키 (접미어 결정에 사용)
 * @returns {Promise<{ticker, name, current_price, today_rate, market}|null>}
 */
async function fetchTickerInfo(ticker, market) {
  const suffix = YF_SUFFIX[market] || '';
  const yfSym = ticker + suffix;
  try {
    const res = await fetch(
      `${YF_BASE}/v8/finance/chart/${yfSym}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const m = json?.chart?.result?.[0]?.meta;
    if (!m) return null;
    const cur = m.regularMarketPrice ?? 0;
    const prev = m.chartPreviousClose ?? cur;
    const rate = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    return {
      ticker,
      name: m.shortName || m.longName || ticker,
      current_price: cur,
      today_rate: parseFloat(rate.toFixed(2)),
      market: market || 'NYSE',
    };
  } catch {
    return null;
  }
}

/**
 * 종목 코드 배열의 특정 페이지를 Yahoo Finance로 병렬 조회
 * @param {string[]} codes   - 전체 종목 코드 배열
 * @param {string}   market  - 지수 키
 * @param {number}   page    - 페이지 번호 (0-indexed)
 * @param {number}   [size]  - 페이지 크기
 * @returns {Promise<Array>}
 */
export async function fetchTickerInfoPage(codes, market, page, size = PAGE_SIZE) {
  const slice = codes.slice(page * size, (page + 1) * size);
  const results = await Promise.all(
    slice.map((ticker) => fetchTickerInfo(ticker, market)),
  );
  return results.filter(Boolean);
}

/**
 * AI 상위 종목 목록 조회 (전체 뷰 기본)
 * - 백엔드 top-tickers에서 이름 포함 티커 가져옴
 * - 가격은 Yahoo Finance로 별도 조회 필요
 * @returns {Promise<Array<{ticker, name, buy_prob, timesfm_signal}>>}
 */
export async function fetchTopTickerList() {
  const res = await fetch(`${API_BASE}/auto-trade/top-tickers`);
  if (!res.ok) throw new Error(`top-tickers 조회 실패: ${res.status}`);
  const data = await res.json();
  const all = (data || []).flatMap((d) => d.tickers || []);
  // 중복 제거 — buy_prob가 높은 항목 유지
  const map = new Map();
  for (const t of all) {
    if (!map.has(t.ticker) || t.buy_prob > map.get(t.ticker).buy_prob) {
      map.set(t.ticker, t);
    }
  }
  return [...map.values()].sort((a, b) => b.buy_prob - a.buy_prob);
}

/**
 * top-tickers 목록에 실제 시세를 병합하여 반환
 * @returns {Promise<Array>}
 */
export async function fetchTopTickersWithPrice() {
  const tops = await fetchTopTickerList();
  const codes = tops.map((t) => t.ticker);
  const priced = await fetchTickerInfoPage(codes, null, 0, codes.length);
  return priced.map((t) => {
    const top = tops.find((x) => x.ticker === t.ticker);
    return { ...t, name: top?.name || t.name, market: 'NASDAQ' };
  });
}
