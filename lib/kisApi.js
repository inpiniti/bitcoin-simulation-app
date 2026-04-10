/**
 * KIS (한국투자증권) API 클라이언트
 * 백엔드 HuggingFace Space 경유 호출
 *
 * 미결 사항: 백엔드에 /kis/balance, /kis/order 엔드포인트 추가 필요
 */

const BASE_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';

/**
 * KIS 잔고 조회 (보유 종목 + 예수금)
 * @returns {{ balance: Array, deposit: number }}
 */
export async function fetchKisBalance() {
  const res = await fetch(`${BASE_URL}/kis/balance`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, quantity, side, price }),
  });
  if (!res.ok) throw new Error(`주문 실패 (HTTP ${res.status})`);
  return res.json();
}
