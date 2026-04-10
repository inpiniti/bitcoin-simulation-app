import { create } from 'zustand';

export const useStore = create((set) => ({
  isLoading: false,
  authMode: 'locked',
  accountNo: null,
  setIsLoading: (loading) => set({ isLoading: loading }),
  startGuestSession: () => set({ authMode: 'guest', accountNo: null }),
  startLoginSession: ({ accountNo }) =>
    set({ authMode: 'logged-in', accountNo: accountNo ?? null }),
  resetSession: () => set({ authMode: 'locked', accountNo: null }),
  reset: () => set({ isLoading: false, authMode: 'locked', accountNo: null }),
}));

export default useStore;
