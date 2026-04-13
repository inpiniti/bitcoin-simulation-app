/**
 * TradingView 로고 캐시
 * 1) 앱 시작 시 스캐너에서 ticker → logoid 맵 구성
 * 2) 개별 로고는 필요 시 SVG 텍스트를 fetch → 원형 SvgXml 생성
 */

// ─── ticker → logoid ─────────────────────────────────────────────────────────
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
    const ticker = item.s?.split(':')[1];
    const logoid = item.d?.[0];
    if (ticker && logoid) logoMap.set(ticker.toUpperCase(), logoid);
  }
}

/** 앱 시작 시 한 번 호출 */
export async function initLogoCache() {
  if (initialized) return;
  initialized = true;
  try {
    await Promise.all([fetchMarket('america'), fetchMarket('korea')]);
  } catch { /* 실패 시 이니셜 배지 폴백 */ }
}

/** ticker 로고 SVG URL 반환 (캐시에 없으면 null) */
export function getLogoUrl(ticker) {
  const logoid = logoMap.get(ticker?.toUpperCase());
  if (!logoid) return null;
  return `https://s3-symbol-logo.tradingview.com/${logoid}--big.svg`;
}

/** 로고 URL 존재 여부 확인 */
export function hasLogo(ticker) {
  return !!logoMap.get(ticker?.toUpperCase());
}
