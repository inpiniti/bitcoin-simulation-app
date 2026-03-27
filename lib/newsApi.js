/**
 * 뉴스 API 클라이언트
 * 이슈 #19
 */

import { BACKEND_URL } from './backendApi';

/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환한다.
 * @returns {string}
 */
export function getTodayKST() {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 특정 날짜의 뉴스를 가져온다.
 * @param {string} [date] - YYYY-MM-DD 형식 (생략 시 오늘 KST)
 * @returns {Promise<{ date: string, count: number, items: Array }>}
 */
export async function fetchNewsByDate(date) {
  const targetDate = date ?? getTodayKST();

  const response = await fetch(
    `${BACKEND_URL}/news?date=${encodeURIComponent(targetDate)}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
