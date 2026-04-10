/**
 * KIS (한국투자증권) API 클라이언트
 * 앱에서 KIS OpenAPI를 직접 호출합니다.
 */

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
let kisAuth = {
  accountNo: null,
  accountCode: null,
  appkey: null,
  appsecret: null,
  accessToken: null,
};

function toNumber(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized) return fallback;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : fallback;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseAccount(accountNo) {
  const raw = String(accountNo || '').trim();
  if (!raw) {
    throw new Error('계좌번호를 입력해 주세요.');
  }

  // 허용 포맷: 12345678-01 또는 1234567801 (8자리만 입력 시 계좌상품코드 01 기본값 적용)
  if (/^\d{8}-\d{2}$/.test(raw)) {
    const [cano, accountCode] = raw.split('-');
    return { cano, accountCode };
  }

  if (/^\d{10}$/.test(raw)) {
    return { cano: raw.slice(0, 8), accountCode: raw.slice(8, 10) };
  }

  if (/^\d{8}$/.test(raw)) {
    return { cano: raw, accountCode: '01' };
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return { cano: digits.slice(0, 8), accountCode: digits.slice(8, 10) };
  }

  if (digits.length === 8) {
    return { cano: digits, accountCode: '01' };
  }

  throw new Error(
    '계좌번호 형식이 올바르지 않아요. 예: 12345678-01 또는 1234567801',
  );
}

function buildKisHeaders({
  trId,
  includeAuth = true,
  contentType = 'application/json; charset=utf-8',
} = {}) {
  const headers = { 'Content-Type': contentType };
  if (kisAuth.accessToken)
    headers.Authorization = `Bearer ${kisAuth.accessToken}`;
  if (kisAuth.appkey) headers.appkey = kisAuth.appkey;
  if (kisAuth.appsecret) headers.appsecret = kisAuth.appsecret;
  if (trId) headers.tr_id = trId;
  headers.custtype = 'P';

  if (!includeAuth) {
    delete headers.Authorization;
  }

  return headers;
}

async function parseJsonResponse(res, fallbackMessage) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_e) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.msg1 || data?.message || text || fallbackMessage;
    throw new Error(`${fallbackMessage} (HTTP ${res.status}) - ${message}`);
  }

  return data;
}

export function clearKisAuth() {
  kisAuth = {
    accountNo: null,
    accountCode: null,
    appkey: null,
    appsecret: null,
    accessToken: null,
  };
}

export function setKisAuth({ accountNo, appkey, appsecret, accessToken }) {
  const parsed = accountNo
    ? parseAccount(accountNo)
    : { cano: null, accountCode: null };
  kisAuth = {
    accountNo: parsed.cano,
    accountCode: parsed.accountCode,
    appkey: appkey ?? null,
    appsecret: appsecret ?? null,
    accessToken: accessToken ?? null,
  };
}

export async function issueKisToken({ appkey, appsecret }) {
  const res = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey,
      appsecret,
    }),
  });

  const data = await parseJsonResponse(res, '토큰 발급 실패');
  const accessToken = data?.access_token;
  if (!accessToken) {
    throw new Error(data?.msg1 || '토큰 응답 형식이 올바르지 않아요.');
  }

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
  if (!kisAuth.accountNo || !kisAuth.accountCode) {
    throw new Error('계좌번호가 올바르지 않아요. (8자리-2자리 형식)');
  }

  const params = new URLSearchParams({
    CANO: kisAuth.accountNo,
    ACNT_PRDT_CD: kisAuth.accountCode,
    WCRC_FRCR_DVSN_CD: '02',
    NATN_CD: '840',
    TR_MKET_CD: '00',
    INQR_DVSN_CD: '00',
  });

  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-stock/v1/trading/inquire-present-balance?${params.toString()}`,
    {
      method: 'GET',
      headers: buildKisHeaders({ trId: 'CTRP6504R' }),
    },
  );

  const data = await parseJsonResponse(res, '잔고 조회 실패');
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(data?.msg1 || '잔고 조회 실패');
  }

  const rows = data?.output1 || [];
  const balance = rows
    .map((row) => {
      const qty = toNumber(row?.ccld_qty_smtl1 || row?.cblc_qty13 || 0, 0);
      const avgPrice = toNumber(row?.avg_unpr3 || 0, 0);
      const currentPrice = toNumber(row?.ovrs_now_pric1 || 0, avgPrice);
      const buyAmountForeign = toNumber(row?.frcr_pchs_amt || 0, 0);
      const evalAmountForeign = toNumber(
        row?.frcr_evlu_amt2 || 0,
        buyAmountForeign,
      );

      return {
        logo: null,
        ticker: row?.pdno || '',
        name: row?.prdt_name || row?.pdno || 'Unknown',
        qty,
        profit_rate: toNumber(row?.evlu_pfls_rt1 || 0, 0),
        avg_price: avgPrice,
        current_price: currentPrice,
        buy_amount_foreign: buyAmountForeign,
        eval_amount_foreign: evalAmountForeign,
        market: row?.tr_mket_name || null,
        currency: row?.buy_crcy_cd || null,
      };
    })
    .filter((item) => item.ticker);

  const summary = data?.output3 || {};
  const totalAsset = toNumber(summary?.tot_asst_amt || 0, 0);
  const evalAmountFromSummary = toNumber(
    summary?.evlu_amt_smtl || summary?.evlu_amt_smtl_amt || 0,
    0,
  );
  const depositFromSummary = toNumber(
    summary?.tot_dncl_amt || summary?.dncl_amt || 0,
    0,
  );

  const evalAmount =
    evalAmountFromSummary > 0
      ? evalAmountFromSummary
      : totalAsset > 0 && depositFromSummary > 0
        ? Math.max(totalAsset - depositFromSummary, 0)
        : 0;

  const depositAmount =
    totalAsset > 0 && evalAmount > 0
      ? Math.max(totalAsset - evalAmount, 0)
      : depositFromSummary;

  const summaryView = {
    totalAsset,
    evalAmount,
    depositAmount,
    buyAmount: toNumber(
      summary?.pchs_amt_smtl || summary?.pchs_amt_smtl_amt || 0,
      0,
    ),
    profitAmount: toNumber(
      summary?.evlu_pfls_amt_smtl || summary?.tot_evlu_pfls_amt || 0,
      0,
    ),
    profitRate: toNumber(summary?.evlu_erng_rt1 || 0, 0),
  };

  const deposit = depositAmount;

  return { balance, deposit, summary: summaryView };
}

/**
 * KIS 주식 현재가 조회
 * @param {string} ticker - 종목코드
 * @returns {{ ticker: string, current_price: number, today_rate: number }}
 */
export async function fetchKisPrice(ticker) {
  const safeTicker = String(ticker || '')
    .trim()
    .toUpperCase();

  if (/^\d{6}$/.test(safeTicker)) {
    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: 'J',
      fid_input_iscd: safeTicker,
    });
    const res = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${params.toString()}`,
      {
        method: 'GET',
        headers: buildKisHeaders({ trId: 'FHKST01010100', includeAuth: false }),
      },
    );
    const data = await parseJsonResponse(res, '국내 시세 조회 실패');
    if (data?.rt_cd && data.rt_cd !== '0') {
      throw new Error(data?.msg1 || '국내 시세 조회 실패');
    }

    const output = data?.output || {};
    return {
      ticker: safeTicker,
      current_price: toNumber(output?.stck_prpr || 0, 0),
      today_rate: toNumber(output?.prdy_ctrt || 0, 0),
    };
  }

  const params = new URLSearchParams({
    AUTH: '',
    EXCD: 'NAS',
    SYMB: safeTicker,
  });
  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price-detail?${params.toString()}`,
    {
      method: 'GET',
      headers: buildKisHeaders({ trId: 'HHDFS76200200' }),
    },
  );
  const data = await parseJsonResponse(res, '해외 시세 조회 실패');
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(data?.msg1 || '해외 시세 조회 실패');
  }

  const output = data?.output || {};
  return {
    ticker: safeTicker,
    current_price: toNumber(output?.last || 0, 0),
    today_rate: toNumber(output?.rate || 0, 0),
  };
}

/**
 * KIS 매수/매도 주문
 * @param {{ ticker: string, quantity: number, side: 'buy'|'sell', price?: number }} params
 * @returns {{ order_id: string, status: string }}
 */
export async function submitKisOrder({ ticker, quantity, side, price }) {
  if (!kisAuth.accountNo || !kisAuth.accountCode) {
    throw new Error('계좌번호가 올바르지 않아요. (8자리-2자리 형식)');
  }

  const safeTicker = String(ticker || '')
    .trim()
    .toUpperCase();
  if (!safeTicker) {
    throw new Error('종목코드가 비어 있어요.');
  }

  const trId = side === 'buy' ? 'TTTT1002U' : 'TTTT1006U';
  const orderPrice = Number(price);

  const res = await fetch(
    `${KIS_BASE_URL}/uapi/overseas-stock/v1/trading/order`,
    {
      method: 'POST',
      headers: buildKisHeaders({ trId }),
      body: JSON.stringify({
        CANO: kisAuth.accountNo,
        ACNT_PRDT_CD: kisAuth.accountCode,
        OVRS_EXCG_CD: 'NASD',
        PDNO: safeTicker,
        ORD_QTY: String(quantity),
        OVRS_ORD_UNPR:
          Number.isFinite(orderPrice) && orderPrice > 0
            ? String(orderPrice)
            : '0',
        ORD_SVR_DVSN_CD: '0',
        ORD_DVSN: '00',
      }),
    },
  );

  const data = await parseJsonResponse(res, '주문 실패');
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(data?.msg1 || '주문 실패');
  }

  return {
    order_id: data?.output?.ODNO || null,
    status: data?.msg1 || '정상처리',
    raw: data,
  };
}
