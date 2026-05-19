/**
 * 포트폴리오 API
 * 
 * 데이터 소스:
 *  - 포트폴리오(투자자/종목별): 백엔드 /portfolio
 */

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';
const YF_BASE = 'https://query1.finance.yahoo.com';

// 백엔드 캐시 데이터의 sum_ratio/avg_ratio가 "165.92%" 형식 문자열로 오는 경우가 있어 안전하게 숫자로 변환
function parsePercent(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const n = parseFloat(val.replace(/%/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * 백엔드에서 포트폴리오 데이터 조회
 * @returns {Promise<{based_on_person: Array, based_on_stock: Array, meta: object}>}
 */
export async function fetchPortfolioData() {
  try {
    const res = await fetch(`${API_BASE}/portfolio?withDetails=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`포트폴리오 조회 실패: ${res.status}`);
    }

    const data = await res.json();

    return {
      based_on_person: data.based_on_person || [],
      based_on_stock: (data.based_on_stock || []).map((item) => ({
        stock: item.stock,
        name: item.name || item.stock,
        person: item.person || [],
        person_count: Number(item.person_count) || 0,
        sum_ratio: parsePercent(item.sum_ratio),
        avg_ratio: parsePercent(item.avg_ratio),
        dcf_vs_market_cap_pct: item.dcf_vs_market_cap_pct,
        close: Number.isFinite(Number(item.close)) && Number(item.close) > 0 ? Number(item.close) : null,
        exchange: item.exchange || null,
      })),
      meta: data.meta || {},
    };
  } catch (error) {
    console.error('[PortfolioApi] Error:', error);
    throw error;
  }
}

/**
 * Yahoo Finance에서 종목 현재가 일괄 조회 (close가 비어 있는 종목 보충용)
 * @param {string[]} tickers
 * @returns {Promise<Record<string, number>>} ticker → close 가격
 */
export async function fetchClosePrices(tickers) {
  const unique = [...new Set(tickers.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (ticker) => {
      try {
        const res = await fetch(
          `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0' } },
        );
        if (!res.ok) return [ticker, null];
        const json = await res.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        return [ticker, Number.isFinite(price) && price > 0 ? price : null];
      } catch {
        return [ticker, null];
      }
    }),
  );
  const map = {};
  for (const [t, p] of results) {
    if (p != null) map[t] = p;
  }
  return map;
}
