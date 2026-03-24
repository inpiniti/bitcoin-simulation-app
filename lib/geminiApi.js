/**
 * Gemini AI API 클라이언트
 * 백엔드 프록시를 통해 Gemini API 호출
 */

export const BACKEND_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';

/**
 * Gemini AI에 질문
 * @param {string} message - 사용자 메시지
 * @param {string} context - 시장 컨텍스트 (선택사항)
 * @returns {Promise<string>} AI 응답 텍스트
 */
export async function askGemini(message, context = '') {
  const res = await fetch(`${BACKEND_URL}/api/simple/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.response ?? data.text ?? '';
}
