/**
 * KIS (한국투자증권) API 클라이언트
 * 백엔드 HuggingFace Space 경유 호출
 *
 * 미결 사항: 백엔드에 /kis/balance, /kis/order 엔드포인트 추가 필요
 */

const BASE_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';
let kisAuth = {
  accountNo: null,
  appkey: null,
  appsecret: null,
  accessToken: null,
};

function buildKisHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (kisAuth.accessToken) headers.Authorization = `Bearer ${kisAuth.accessToken}`;
  if (kisAuth.appkey) headers.appkey = kisAuth.appkey;
  if (kisAuth.appsecret) headers.appsecret = kisAuth.appsecret;
  if (kisAuth.accountNo) headers['x-account-no'] = kisAuth.accountNo;
  return headers;
}

export function clearKisAuth() {
  kisAuth = {
    accountNo: null,
    appkey: null,
    appsecret: null,
    accessToken: null,
  };
}

export function setKisAuth({ accountNo, appkey, appsecret, accessToken }) {
  kisAuth = {
    accountNo: accountNo ?? null,
    appkey: appkey ?? null,
    appsecret: appsecret ?? null,
    accessToken: accessToken ?? null,
  };
}

export async function issueKisToken({ appkey, appsecret }) {
  const res = await fetch(`${BASE_URL}/kis/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appkey,
      appsecret,
      secret: appsecret,
    }),
  });
  if (!res.ok) throw new Error(`토큰 발급 실패 (HTTP ${res.status})`);
  const data = await res.json();
  const accessToken = data?.access_token || data?.token || data?.accessToken;
  if (!accessToken) throw new Error('토큰 응답 형식이 올바르지 않아요.');
  return accessToken;
}

export async function loginKis({ accountNo, appkey, appsecret }) {
  const accessToken = await issueKisToken({ appkey, appsecret });
  setKisAuth({ accountNo, appkey, appsecret, accessToken });
  return { accessToken };
}

/**
 * KIS 잔고 조회 (보유 종목 + 예수금)
 * @returns {{ balance: Array, deposit: number }}
 */
export async function fetchKisBalance() {
  const query = kisAuth.accountNo
    ? `?account=${encodeURIComponent(kisAuth.accountNo)}`
    : '';
  const res = await fetch(`${BASE_URL}/kis/balance${query}`, {
    method: 'GET',
    headers: buildKisHeaders(),
  });
  if (!res.ok) throw new Error(`잔고 조회 실패 (HTTP ${res.status})`);
  return res.json();
}

/**
 * KIS 주식 현재가 조회
 * @param {string} ticker - 종목코드
 * @returns {{ ticker: string, current_price: number, today_rate: number }}
 */
export async function fetchKisPrice(ticker) {
  const res = await fetch(`${BASE_URL}/kis/price?ticker=${encodeURIComponent(ticker)}`, {
    method: 'GET',
    headers: buildKisHeaders(),
  });
  if (!res.ok) throw new Error(`시세 조회 실패 (HTTP ${res.status})`);
  return res.json();
}

/**
 * KIS 매수/매도 주문
 * @param {{ ticker: string, quantity: number, side: 'buy'|'sell', price?: number }} params
 * @returns {{ order_id: string, status: string }}
 */
export async function submitKisOrder({ ticker, quantity, side, price }) {
  const res = await fetch(`${BASE_URL}/kis/order`, {
    method: 'POST',
    headers: buildKisHeaders(),
    body: JSON.stringify({
      ticker,
      quantity,
      side,
      price,
      account: kisAuth.accountNo,
    }),
  });
  if (!res.ok) throw new Error(`주문 실패 (HTTP ${res.status})`);
  return res.json();
}
