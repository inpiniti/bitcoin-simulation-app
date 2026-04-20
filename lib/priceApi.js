/**
 * Yahoo Finance 종가 / 지수 조회 유틸리티
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

// 지수별 Yahoo Finance 심볼
const INDEX_SYMBOLS = {
  KOSPI: '%5EKS11',
  KOSDAQ: '%5EKQ11',
  NASDAQ: '%5EIXIC',
  NYSE: '%5ENYA',
  SP500: '%5EGSPC',
};

// 티커 그룹 키 → 시장 지수 매핑
const GROUP_INDEX_MAP = {
  sp500:     { symbol: '^GSPC', label: 'S&P 500' },
  qqq:       { symbol: 'QQQ',   label: 'QQQ' },
  nasdaq100: { symbol: '^NDX',  label: '나스닥100' },
  kospi:     { symbol: '^KS11', label: 'KOSPI' },
  kosdaq:    { symbol: '^KQ11', label: 'KOSDAQ' },
};

/**
 * 티커 그룹 키에 해당하는 시장 지수의 특정 날짜 종가 조회
 * @param {string} groupKey - 'sp500' | 'qqq' | 'nasdaq100' | 'kospi' | 'kosdaq'
 * @param {string} tradeDateStr - YYYY-MM-DD
 * @returns {{ label: string, tradeClose: number, nextClose: number|null, changePct: number|null } | null}
 */
export async function fetchGroupIndexByDate(groupKey, tradeDateStr) {
  const info = GROUP_INDEX_MAP[groupKey];
  if (!info) return null;
  const result = await fetchTickerClose(info.symbol, tradeDateStr);
  if (!result || result.tradeClose == null) return null;
  const changePct =
    result.tradeClose && result.nextClose != null
      ? ((result.nextClose - result.tradeClose) / result.tradeClose) * 100
      : null;
  return { label: info.label, tradeClose: result.tradeClose, nextClose: result.nextClose, changePct };
}

/**
 * Yahoo Finance에서 단일 지수 현재값 조회
 * @param {string} key - INDEX_SYMBOLS의 키 (예: 'KOSPI')
 * @returns {{ value: number, change: number } | null}
 */
export async function fetchMarketIndex(key) {
  const symbol = INDEX_SYMBOLS[key];
  if (!symbol) return null;
  try {
    const url = `${YF_BASE}/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const current = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const previous = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    return { value: current, change };
  } catch {
    return null;
  }
}

/**
 * 여러 지수의 현재값을 병렬 조회
 * @param {{ key: string }[]} indices - 지수 목록 (key 필드 필요)
 * @returns {Record<string, { value: number, change: number }>}
 */
export async function fetchAllMarketIndices(indices) {
  const results = await Promise.allSettled(
    indices.map(async (idx) => {
      const data = await fetchMarketIndex(idx.key);
      return { key: idx.key, data };
    }),
  );
  const map = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.data) {
      map[r.value.key] = r.value.data;
    }
  }
  return map;
}

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

/** 그룹 키에 해당하는 Yahoo Finance 지수 심볼 반환 */
export function getIndexSymbol(groupKey) {
  return GROUP_INDEX_MAP[groupKey]?.symbol ?? null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 여러 종목의 당일·다음날 종가를 병렬 조회
 * 실패한 종목은 지수 백오프(1s→2s→4s→8s)로 최대 4회 재시도
 * @param {string[]} tickers
 * @param {string} tradeDateStr
 * @returns {Record<string, { tradeClose: number|null, nextClose: number|null, nextDateStr: string|null }>}
 */
export async function fetchAllTickerCloses(tickers, tradeDateStr) {
  const map = {};
  let remaining = [...tickers];
  const retryDelays = [1000, 2000, 4000, 8000];

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelays[attempt - 1]);
    }

    const results = await Promise.allSettled(
      remaining.map((ticker) =>
        fetchTickerClose(ticker, tradeDateStr).then((data) => ({ ticker, data }))
      )
    );

    const stillFailed = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data?.tradeClose != null) {
        map[r.value.ticker] = r.value.data;
      } else if (r.status === 'fulfilled') {
        stillFailed.push(r.value.ticker);
      }
    }

    remaining = stillFailed;
    if (remaining.length === 0) break;
  }

  return map;
}
