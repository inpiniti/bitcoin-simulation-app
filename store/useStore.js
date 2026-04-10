import { create } from 'zustand';

export const useStore = create((set) => ({
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  reset: () => set({ isLoading: false }),
}));

export default useStore;
