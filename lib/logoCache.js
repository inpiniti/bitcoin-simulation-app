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

// ─── SVG 텍스트 fetch (ticker 당 1회만) ──────────────────────────────────────
const fetchPromises = new Map(); // ticker → Promise<string|null>

function getRawUrl(ticker) {
  const logoid = logoMap.get(ticker?.toUpperCase());
  if (!logoid) return null;
  return `https://s3-symbol-logo.tradingview.com/${logoid}--big.svg`;
}

function fetchRawSvg(ticker) {
  if (fetchPromises.has(ticker)) return fetchPromises.get(ticker);
  const url = getRawUrl(ticker);
  if (!url) { fetchPromises.set(ticker, Promise.resolve(null)); return Promise.resolve(null); }

  const p = fetch(url)
    .then(r => (r.ok ? r.text() : null))
    .catch(() => null);
  fetchPromises.set(ticker, p);
  return p;
}

// ─── 원형 SvgXml 조립 ────────────────────────────────────────────────────────
function buildCircularXml(rawSvg, size, clipId) {
  if (!rawSvg) return null;

  // 원본 viewBox 추출
  const vbMatch = rawSvg.match(/viewBox=["']([^"']+)["']/i);
  const viewBox = vbMatch ? vbMatch[1] : '0 0 100 100';

  // <svg>...</svg> 사이 내용 추출
  const innerMatch = rawSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const inner = innerMatch ? innerMatch[1].trim() : '';

  const cx  = size / 2;
  const pad = 4;
  const s   = size - pad * 2;

  // 외부 SVG: 흰 원 배경 + clipPath
  // 내부 SVG: 원본 viewBox + preserveAspectRatio(contain) + clip 적용
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<defs><clipPath id="${clipId}"><circle cx="${cx}" cy="${cx}" r="${cx}"/></clipPath></defs>` +
      `<circle cx="${cx}" cy="${cx}" r="${cx}" fill="white"/>` +
      `<svg x="${pad}" y="${pad}" width="${s}" height="${s}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})">` +
        inner +
      `</svg>` +
    `</svg>`
  );
}

/**
 * ticker 에 맞는 원형 SvgXml 문자열을 반환합니다.
 * 없으면 null → LogoBadge 가 이니셜 배지 폴백 사용.
 */
export async function fetchSvgXml(ticker, size) {
  const raw = await fetchRawSvg(ticker);
  const clipId = `clip-${(ticker || '').toLowerCase()}-${size}`;
  return buildCircularXml(raw, size, clipId);
}

/** 로고 URL이 존재하는지 여부만 확인 (로딩 표시 등에 사용) */
export function hasLogo(ticker) {
  return !!logoMap.get(ticker?.toUpperCase());
}
