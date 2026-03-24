import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 앱 전역 상태 스토어
 * persist 미들웨어로 AsyncStorage에 상태 유지
 */
export const useStore = create(
  persist(
    (set, get) => ({
      // 서버 상태
      serverStatus: null,
      isLoading: false,

      // 서버 상태 업데이트
      setServerStatus: (status) => set({ serverStatus: status }),

      // 로딩 상태
      setIsLoading: (loading) => set({ isLoading: loading }),

      // 스토어 초기화 (테스트용)
      reset: () =>
        set({
          serverStatus: null,
          isLoading: false,
        }),
    }),
    {
      name: 'bitcoin-simulation-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        serverStatus: state.serverStatus,
      }),
    }
  )
);

export default useStore;
