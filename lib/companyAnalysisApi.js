/**
 * AI 기업 분석 및 실적 리뷰용 API 라이브러리
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * 특정 티커(Ticker)에 대한 AI 기업 분석 또는 실적 리뷰 리포트를 요청합니다.
 * @param {string} ticker - 주식 티커 (예: TSLA, AAPL, NVDA)
 * @param {string} type - 'market' | 'earnings' | 'valuation' | 'preview' | 'moat' | 'risk'
 * @returns {Promise<{status: string, ticker: string, analysis_type: string, analysis_date: string, report: string}>}
 */
export async function requestCompanyAnalysis(ticker, type = 'market') {
  try {
    const url = `${API_BASE_URL}/api/analysis/company`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker: ticker.trim().toUpperCase(),
        analysis_type: type,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[companyAnalysisApi] requestCompanyAnalysis error:', error);
    throw error;
  }
}

/**
 * 실시간 글로벌 거시경제 지표 데이터를 조회합니다.
 * @returns {Promise<{status: string, macro_data: object}>}
 */
export async function fetchMacroData() {
  try {
    const url = `${API_BASE_URL}/api/analysis/macro-data`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[companyAnalysisApi] fetchMacroData error:', error);
    throw error;
  }
}

/**
 * 거시경제 분석 리포트 및 자산 배분 비중 분석을 요청합니다.
 * @returns {Promise<{status: string, analysis_date: string, report: string, macro_data: object}>}
 */
export async function requestMacroAnalysis() {
  try {
    const url = `${API_BASE_URL}/api/analysis/macro`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[companyAnalysisApi] requestMacroAnalysis error:', error);
    throw error;
  }
}
