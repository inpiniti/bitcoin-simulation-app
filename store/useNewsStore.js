/**
 * 뉴스 전역 상태 스토어
 * 이슈 #19
 */

import { create } from 'zustand';
import { fetchNewsByDate, getTodayKST } from '../lib/newsApi';

export const useNewsStore = create((set, get) => ({
  items: [],
  selectedDate: getTodayKST(),
  isLoading: false,
  error: null,

  /**
   * 선택된 날짜 변경
   * @param {string} date - YYYY-MM-DD
   */
  setSelectedDate: (date) => set({ selectedDate: date }),

  /**
   * 특정 날짜의 뉴스를 불러온다.
   * @param {string} [date] - YYYY-MM-DD (생략 시 selectedDate 사용)
   */
  fetchNews: async (date) => {
    const targetDate = date ?? get().selectedDate;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchNewsByDate(targetDate);
      set({
        items: data.items ?? [],
        selectedDate: targetDate,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false, error: err.message });
    }
  },
}));

export default useNewsStore;
