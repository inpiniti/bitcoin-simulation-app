/**
 * KIS 해외주식 현재가상세 API
 * https://openapi.koreainvestment.com:9443/uapi/overseas-price/v1/quotations/price-detail
 */
import axios from 'axios';

const KIS_API_BASE = 'https://openapi.koreainvestment.com:9443';
const KIS_PRICE_DETAIL_ENDPOINT = '/uapi/overseas-price/v1/quotations/price-detail';

/**
 * KIS 해외주식 현재가 조회
 * @param {string} ticker - 종목코드 (예: AAPL)
 * @param {string} market - 거래소 (예: NYS, NAS)
 * @returns {{ lastPrice: number|null, error: object|null }}
 */
export async function fetchCurrentPrice(ticker, market) {
  try {
    const appkey = process.env.EXPO_PUBLIC_KIS_APPKEY;
    const appsecret = process.env.EXPO_PUBLIC_KIS_APPSECRET;
    const accessToken = process.env.EXPO_PUBLIC_KIS_ACCESS_TOKEN;

    if (!appkey || !appsecret || !accessToken) {
      return {
        lastPrice: null,
        error: { message: 'KIS API 인증 정보 미설정' },
      };
    }

    const response = await axios.get(KIS_API_BASE + KIS_PRICE_DETAIL_ENDPOINT, {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        authorization: `Bearer ${ accessToken }`,
        appkey,
        appsecret,
        'tr_id': 'HHDFS76200200',
      },
      params: {
        AUTH: '',
        EXCD: market.toUpperCase(),
        SYMB: ticker.toUpperCase(),
      },
      timeout: 5000,
    });

    const { output } = response.data;
    if (output && output.last) {
      return {
        lastPrice: parseFloat(output.last),
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
