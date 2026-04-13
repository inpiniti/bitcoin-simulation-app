/**
 * TradingView 로고 캐시
 * 앱 시작 시 미국/한국 스캐너 데이터를 한 번 가져와서
 * ticker → logoid 매핑을 메모리에 저장합니다.
 *
 * 로고 URL: https://s3-symbol-logo.tradingview.com/{logoid}.svg
 */

const logoMap = new Map();
let initialized = false;

async function fetchMarket(market) {
  const resp = await fetch(`https://scanner.tradingview.com/${market}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      columns: ['logoid'],
      range: [0, 5000],
      sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    }),
  });
  if (!resp.ok) return;
  const json = await resp.json();
  for (const item of json.data ?? []) {
    // "NASDAQ:AAPL" → "AAPL",  "KRX:005930" → "005930"
    const ticker = item.s?.split(':')[1];
    const logoid = item.d?.[0];
    if (ticker && logoid) {
      logoMap.set(ticker.toUpperCase(), logoid);
    }
  }
}

/** 앱 시작 시 한 번 호출 — 이후 호출은 no-op */
export async function initLogoCache() {
  if (initialized) return;
  initialized = true;
  try {
    await Promise.all([
      fetchMarket('america'),
      fetchMarket('korea'),
    ]);
  } catch {
    // 네트워크 실패 시 조용히 무시 — InitialBadge 폴백 사용
  }
}

/**
 * 티커에 해당하는 로고 URL을 반환합니다.
 * 캐시에 없으면 null 반환 → InitialBadge 폴백 사용.
 */
export function getLogoUrl(ticker) {
  if (!ticker) return null;
  const logoid = logoMap.get(ticker.toUpperCase());
  if (!logoid) return null;
  // --big.svg 는 여백 없이 이미지가 꽉 차서 원형 클리핑에 적합
  return `https://s3-symbol-logo.tradingview.com/${logoid}--big.svg`;
}
