import { create } from 'zustand';

export const useStore = create((set) => ({
  isLoading: false,
  authMode: 'locked',
  accountNo: null,
  userId: null,
  setIsLoading: (loading) => set({ isLoading: loading }),
  startGuestSession: () => set({ authMode: 'guest', accountNo: null, userId: null }),
  startLoginSession: ({ accountNo, userId }) =>
    set({ authMode: 'logged-in', accountNo: accountNo ?? null, userId: userId ?? null }),
  resetSession: () => set({ authMode: 'locked', accountNo: null, userId: null }),
  reset: () => set({ isLoading: false, authMode: 'locked', accountNo: null, userId: null }),
}));

export default useStore;
