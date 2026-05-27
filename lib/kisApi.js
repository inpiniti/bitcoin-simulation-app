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

function firstDefinedValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
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
 * KIS 잔고 조회 (기존 호환성 유지)
 */
export async function fetchKisBalance() {
  const data = await fetchKisBalanceInternal('01');
  return {
    balance: data.balance,
    deposit: data.summary.depositAmount,
    summary: data.summary,
  };
}

/**
 * KIS 원화/외화 통합 잔고 조회
 *
 * 원화 모드(01)로 한 번만 호출하고, output1의 bass_exrt(기준 환율)로
 * 나누어 USD 값을 계산합니다. KIS의 달러 모드(02) 응답은 원화 모드와
 * 거의 동일한 값을 환산한 것일 뿐이라 두 번 호출할 필요가 없습니다.
 */
export async function fetchKisFullBalance() {
  const krwData = await fetchKisBalanceInternal('01');
  const rate = krwData.exchangeRate || 1;
  const toUsd = (v) => (rate > 0 ? v / rate : 0);

  const holdings = krwData.balance.map((krw) => ({
    ticker: krw.ticker,
    name: krw.name,
    qty: krw.qty,
    profit_rate: krw.profit_rate,
    avg_price_krw: krw.avg_price,
    current_price_krw: krw.current_price,
    buy_amount_krw: krw.buy_amount,
    eval_amount_krw: krw.eval_amount,
    profit_amount_krw: krw.profit_amount,
    avg_price_usd: toUsd(krw.avg_price),
    current_price_usd: toUsd(krw.current_price),
    buy_amount_usd: toUsd(krw.buy_amount),
    eval_amount_usd: toUsd(krw.eval_amount),
    profit_amount_usd: toUsd(krw.profit_amount),
    avg_price: krw.avg_price,
    current_price: krw.current_price,
    buy_amount: krw.buy_amount,
    eval_amount: krw.eval_amount,
    eval_amount_foreign: toUsd(krw.eval_amount),
  }));

  return {
    krw: krwData.summary,
    usd: {
      totalAsset: toUsd(krwData.summary.totalAsset),
      evalAmount: toUsd(krwData.summary.evalAmount),
      depositAmount: toUsd(krwData.summary.depositAmount),
      profitRate: krwData.summary.profitRate,
      profitAmount: toUsd(krwData.summary.profitAmount),
    },
    holdings,
    exchangeRate: rate,
  };
}

async function fetchKisBalanceInternal(currencyDivision) {
  if (!kisAuth.accountNo || !kisAuth.accountCode) {
    throw new Error('계좌번호가 올바르지 않아요. (8자리-2자리 형식)');
  }

  const params = new URLSearchParams({
    CANO: kisAuth.accountNo,
    ACNT_PRDT_CD: kisAuth.accountCode,
    WCRC_FRCR_DVSN_CD: currencyDivision,
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
      const buyAmount = toNumber(row?.frcr_pchs_amt || 0, 0);
      const evalAmount = toNumber(row?.frcr_evlu_amt2 || 0, buyAmount);
      const profitAmount = toNumber(row?.evlu_pfls_amt2 || 0, 0);

      return {
        ticker: row?.pdno || '',
        name: row?.prdt_name || row?.pdno || 'Unknown',
        qty,
        profit_rate: toNumber(row?.evlu_pfls_rt1 || 0, 0),
        avg_price: avgPrice,
        current_price: currentPrice,
        buy_amount: buyAmount,
        eval_amount: evalAmount,
        profit_amount: profitAmount,
      };
    })
    .filter((item) => item.ticker);

  const summary = data?.output3 || {};
  const profitRate = toNumber(summary?.evlu_erng_rt1 || 0, 0);

  const totalAsset = toNumber(summary?.tot_asst_amt || 0, 0);
  const evalAmount = toNumber(
    summary?.evlu_amt_smtl_amt || summary?.evlu_amt_smtl || 0,
    0,
  );
  const depositAmount = totalAsset - evalAmount;
  const profitAmount = toNumber(
    summary?.evlu_pfls_amt_smtl || summary?.tot_evlu_pfls_amt || 0,
    0,
  );

  // 기준 환율 — output1.bass_exrt 우선, 없으면 output2.frst_bltn_exrt
  const exchangeRate = toNumber(
    rows[0]?.bass_exrt || data?.output2?.[0]?.frst_bltn_exrt || 0,
    0,
  );

  return {
    balance,
    exchangeRate,
    summary: {
      totalAsset,
      evalAmount,
      depositAmount,
      profitRate,
      profitAmount,
    },
  };
}

/**
 * KIS 주식 현재가 조회
 * @param {string} ticker - 종목코드
 * @returns {{ ticker: string, current_price: number, today_rate: number }}
 */
/**
 * KIS API용 ticker 변환 (웹 bitcoin-simulation의 kisWebSocket.js와 동일):
 *   - 점(.) → 슬래시(/) (예: BRK.B → BRK/B)
 *   - 하이픈(-) → 제거    (예: BRK-B → BRKB)
 */
export function toKisTicker(ticker) {
  return String(ticker || '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '/')
    .replace(/-/g, '');
}

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
    SYMB: toKisTicker(safeTicker),
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
        PDNO: toKisTicker(safeTicker),
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

/**
 * KIS 해외주식 현재가 조회 (실시간 매매용)
 * @param {string} ticker - 종목코드 (예: AAPL)
 * @param {string} market - 거래소 (예: NYS, NAS)
 * @returns {{ lastPrice: number|null, error: object|null }}
 */
export async function fetchCurrentPrice(ticker, market) {
  try {
    const safeTicker = String(ticker || '')
      .trim()
      .toUpperCase();
    const safeMarket = String(market || 'NAS')
      .trim()
      .toUpperCase();

    if (!safeTicker) {
      return {
        lastPrice: null,
        error: { message: '종목코드를 입력해주세요' },
      };
    }

    // 국내주식 (코스피/코스닥): 6자리 코드 + 국내 시세 엔드포인트
    if (safeMarket === 'KRX' || safeMarket === 'KOSDAQ') {
      // J: KRX (코스피/코스닥 통합), NX: NXT, UN: 통합
      // 현재 시간 (HHMMSS 형식)
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentTime = hours + minutes + seconds;

      const domesticParams = new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: safeTicker,
        FID_INPUT_HOUR_1: currentTime,
      });
      const domesticUrl = `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-time-itemconclusion?${domesticParams}`;
      const domesticRes = await fetch(domesticUrl, {
        method: 'GET',
        headers: buildKisHeaders({ trId: 'FHPST01060000' }),
      });

      const domesticData = await domesticRes.json();

      if (!domesticRes.ok) {
        const errorMsg = domesticData?.msg1 || domesticData?.message || '알 수 없는 오류';
        const detailLog = `
국내주식 현재가 조회 실패
- URL: ${domesticUrl}
- Status: ${domesticRes.status}
- 종목코드(ticker): ${safeTicker}
- 시장(market): ${safeMarket}
- fid_cond_mrkt_div_code: ${marketDivCode}
- KIS 응답: ${JSON.stringify(domesticData)}
        `;
        console.error(detailLog);
        return { lastPrice: null, error: { message: `KIS API 오류: ${domesticRes.status} - ${errorMsg}`, details: detailLog } };
      }

      const price = toNumber(domesticData?.output1?.stck_prpr, null);
      if (price) {
        return { lastPrice: price, error: null };
      }
      return { lastPrice: null, error: { message: domesticData?.msg1 || '현재가 조회 실패' } };
    }

    const queryParams = new URLSearchParams({
      AUTH: '',
      EXCD: safeMarket,
      SYMB: toKisTicker(safeTicker),
    });

    const url = `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price-detail?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: buildKisHeaders({ trId: 'HHDFS76200200' }),
    });

    if (!response.ok) {
      return {
        lastPrice: null,
        error: { message: `KIS API 오류: ${response.status}` },
      };
    }

    const data = await response.json();
    const { output } = data;

    if (output && output.last) {
      return {
        lastPrice: toNumber(output.last, null),
        error: null,
      };
    }

    return {
      lastPrice: null,
      error: { message: '현재가 조회 실패' },
    };
  } catch (e) {
    return {
      lastPrice: null,
      error: { message: e.message || '현재가 조회 중 오류 발생' },
    };
  }
}

/**
 * 여러 종목의 현재가 동시 조회 (병렬 처리)
 * @param {Array<{ticker: string, market: string}>} tickers - 종목 목록
 * @returns {Promise<Array>} - [{ ticker, market, lastPrice, error }, ...]
 */
export async function fetchMultiplePrices(tickers) {
  const promises = tickers.map(async ({ ticker, market }) => {
    const result = await fetchCurrentPrice(ticker, market);
    return {
      ticker,
      market,
      ...result,
    };
  });

  return Promise.all(promises);
}

/**
 * KIS 웹소켓 접속키 발급
 * @param {string} appkey - KIS appkey
 * @param {string} appsecret - KIS appsecret
 * @returns {{ approval_key: string|null, error: object|null }}
 */
export async function issueWebSocketKey(appkey, appsecret) {
  try {
    const res = await fetch(`${KIS_BASE_URL}/oauth2/Approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; utf-8' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey,
        secretkey: appsecret,
      }),
    });

    const data = await parseJsonResponse(res, '웹소켓 접속키 발급 실패');
    const approval_key = data?.approval_key;
    if (!approval_key) {
      return {
        approval_key: null,
        error: {
          message:
            data?.msg1 || '웹소켓 접속키 발급 응답 형식이 올바르지 않아요.',
        },
      };
    }

    return { approval_key, error: null };
  } catch (e) {
    return {
      approval_key: null,
      error: { message: e.message || '웹소켓 접속키 발급 중 오류 발생' },
    };
  }
}

/**
 * KIS 국내주식 시가총액 상위 조회 (코스피200 등)
 * @param {string} marketCode - fid_input_iscd: '2001'(코스피200), '0001'(코스피), '1001'(코스닥), '0000'(전체)
 * @returns {Promise<Array<{ stock, name, close, market_cap, change_rate, rank }>>}
 *   - market_cap 단위: 억원
 */
export async function fetchKospiMarketCap(marketCode = '2001') {
  if (!kisAuth.accessToken) {
    throw new Error('로그인이 필요해요. (KIS 토큰 없음)');
  }

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: 'J',
    fid_cond_scr_div_code: '20174',
    fid_div_cls_code: '0',
    fid_input_iscd: marketCode,
    fid_trgt_cls_code: '0',
    fid_trgt_exls_cls_code: '0',
    fid_input_price_1: '',
    fid_input_price_2: '',
    fid_vol_cnt: '',
  });

  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/market-cap?${params.toString()}`,
    {
      method: 'GET',
      headers: buildKisHeaders({ trId: 'FHPST01740000' }),
    },
  );

  const data = await parseJsonResponse(res, '시가총액 순위 조회 실패');
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(data?.msg1 || '시가총액 순위 조회 실패');
  }

  const rows = data?.output || [];
  return rows
    .map((row) => ({
      stock: row?.mksc_shrn_iscd || '',
      name: row?.hts_kor_isnm || row?.mksc_shrn_iscd || '',
      close: toNumber(row?.stck_prpr, 0),
      market_cap: toNumber(row?.stck_avls, 0),
      change_rate: toNumber(row?.prdy_ctrt, 0),
      rank: toNumber(row?.data_rank, 0),
    }))
    .filter((r) => r.stock);
}

/**
 * KIS 국내주식 잔고 조회 (1단계)
 * 앱이 직접 호출하는 버전
 */
export async function fetchKisDomesticBalance() {
  if (!kisAuth.accountNo || !kisAuth.accountCode) {
    throw new Error('계좌번호가 올바르지 않아요. (8자리-2자리 형식)');
  }

  const params = new URLSearchParams({
    CANO: kisAuth.accountNo,
    ACNT_PRDT_CD: kisAuth.accountCode,
    AFHR_FLPR_YN: 'N',
    INQR_DVSN: '01',
    UNPR_DVSN: '01',
    FUND_STTL_ICLD_YN: 'N',
    FNCG_AMT_AUTO_RDPT_YN: 'N',
    PRCS_DVSN: '00',
  });

  const res = await fetch(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/trading/inquire-balance?${params.toString()}`,
    {
      method: 'GET',
      headers: buildKisHeaders({ trId: 'TTTC8434R' }),
    },
  );

  const data = await parseJsonResponse(res, '국내 잔고 조회 실패');
  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(data?.msg1 || '국내 잔고 조회 실패');
  }

  const output1 = data?.output1 || [];
  const output2 = data?.output2?.[0] || {};

  const holdings = output1
    .map((row) => {
      const qty = toNumber(row?.hldg_qty || 0, 0);
      const avgPrice = toNumber(row?.pchs_avg_pric || 0, 0);
      const currentPrice = toNumber(row?.prpr || avgPrice, avgPrice);
      const buyAmount = toNumber(row?.pchs_amt || 0, 0);
      const evalAmount = toNumber(row?.evlu_amt || buyAmount, buyAmount);
      const profitAmount = toNumber(row?.evlu_pfls_amt || 0, 0);

      return {
        ticker: row?.pdno || '',
        name: row?.prdt_name || row?.pdno || '미상',
        qty,
        profit_rate: toNumber(row?.evlu_pfls_rt || 0, 0),
        avg_price: avgPrice,
        current_price: currentPrice,
        buy_amount: buyAmount,
        eval_amount: evalAmount,
        profit_amount: profitAmount,
      };
    })
    .filter((item) => item.ticker);

  const summary = {
    totalAsset: toNumber(
      output2?.tot_evlu_amt || output2?.dnca_tot_amt || 0,
      0,
    ),
    evalAmount: toNumber(output2?.scts_evlu_amt || 0, 0),
    depositAmount: toNumber(output2?.dnca_tot_amt || 0, 0),
    profitRate: toNumber(output2?.evlu_erng_rt || 0, 0),
    profitAmount: toNumber(output2?.evlu_pfls_amt_smtl || 0, 0),
  };

  return {
    holdings,
    summary,
  };
}
