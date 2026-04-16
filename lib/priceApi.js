/**
 * Yahoo Finance 종가 조회 유틸리티
 *
 * trade_date (미국 시장 날짜, UTC 기준)의 당일 종가와
 * 다음 미국 거래일 종가를 조회한다.
 *
 * 시간대 기준:
 *  - 백엔드는 UTC 기준으로 trade_date를 저장 (미국 시장 날짜와 동일)
 *  - 미국 EDT (UTC-4): 장 시작 13:30 UTC, 장 마감 20:00 UTC
 *  - Yahoo Finance 1d 바의 timestamp는 13:30 UTC 전후 → UTC 날짜 = 미국 거래일
 */

const YF_BASE = 'https://query1.finance.yahoo.com';

/**
 * dateStr (YYYY-MM-DD) + offsetDays 를 Unix 타임스탬프로 변환
 * ET 자정(04:00 UTC)을 기준으로 사용
 */
function dateToEpoch(dateStr, offsetDays = 0) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d + offsetDays, 4, 0, 0) / 1000);
}

/**
 * Unix 타임스탬프 → YYYY-MM-DD (UTC 기준)
 * 미국 EDT 장중 시간(13:30~20:00 UTC)은 UTC 날짜 = 미국 거래일
 */
function tsToDateStr(unixTs) {
  return new Date(unixTs * 1000).toISOString().slice(0, 10);
}

/**
 * Yahoo Finance에서 단일 종목의 당일·다음날 종가 조회
 * @param {string} ticker - 종목 코드 (예: "DASH")
 * @param {string} tradeDateStr - 미국 거래일 (YYYY-MM-DD)
 * @returns {{ tradeClose: number|null, nextClose: number|null, nextDateStr: string|null } | null}
 */
export async function fetchTickerClose(ticker, tradeDateStr) {
  try {
    // trade_date 하루 전 ~ 8일 후 범위 조회 (주말·공휴일 포함해 다음 거래일 확보)
    const period1 = dateToEpoch(tradeDateStr, -1);
    const period2 = dateToEpoch(tradeDateStr, 8);
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    let tradeClose = null;
    let nextClose = null;
    let nextDateStr = null;

    for (let i = 0; i < timestamps.length; i++) {
      const ds = tsToDateStr(timestamps[i]);
      const close = closes[i];
      if (close == null) continue;

      if (ds === tradeDateStr) {
        tradeClose = close;
      } else if (tradeClose !== null && nextClose === null && ds > tradeDateStr) {
        // 첫 번째 trade_date 이후 거래일 = 다음날
        nextClose = close;
        nextDateStr = ds;
      }
    }

    return { tradeClose, nextClose, nextDateStr };
  } catch {
    return null;
  }
}

/**
 * 여러 종목의 당일·다음날 종가를 병렬 조회
 * @param {string[]} tickers
 * @param {string} tradeDateStr
 * @returns {Record<string, { tradeClose: number|null, nextClose: number|null, nextDateStr: string|null }>}
 */
export async function fetchAllTickerCloses(tickers, tradeDateStr) {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const data = await fetchTickerClose(ticker, tradeDateStr);
      return { ticker, data };
    })
  );

  const map = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.data) {
      map[r.value.ticker] = r.value.data;
    }
  }
  return map;
}
