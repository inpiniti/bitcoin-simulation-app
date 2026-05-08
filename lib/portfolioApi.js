/**
 * 포트폴리오 API
 * 
 * 데이터 소스:
 *  - 포트폴리오(투자자/종목별): 백엔드 /portfolio
 */

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';

/**
 * 백엔드에서 포트폴리오 데이터 조회
 * @returns {Promise<{based_on_person: Array, based_on_stock: Array, meta: object}>}
 */
export async function fetchPortfolioData() {
  try {
    const res = await fetch(`${API_BASE}/portfolio?withDetails=true`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`포트폴리오 조회 실패: ${res.status}`);
    }

    const data = await res.json();
    
    // 데이터 정형화 (web2 로직 참고)
    return {
      based_on_person: data.based_on_person || [],
      based_on_stock: (data.based_on_stock || []).map((item) => ({
        stock: item.stock,
        name: item.name || item.stock,
        person: item.person || [],
        person_count: item.person_count || 0,
        sum_ratio: item.sum_ratio || 0,
        avg_ratio: item.avg_ratio,
        dcf_vs_market_cap_pct: item.dcf_vs_market_cap_pct,
        close: item.close || null,
        exchange: item.exchange || null,
      })),
      meta: data.meta || {},
    };
  } catch (error) {
    console.error('[PortfolioApi] Error:', error);
    throw error;
  }
}
