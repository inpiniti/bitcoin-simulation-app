import { act } from 'react';
import { useStore } from '../store/useStore';

// AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    const state = useStore.getState();
    if (state.reset) {
      act(() => state.reset());
    }
  });

  it('should be a valid zustand store', () => {
    expect(useStore).toBeDefined();
    expect(typeof useStore.getState).toBe('function');
    expect(typeof useStore.setState).toBe('function');
    expect(typeof useStore.subscribe).toBe('function');
  });

  it('should have initial state', () => {
    const state = useStore.getState();
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });

  it('should have isLoading in initial state', () => {
    const state = useStore.getState();
    expect(typeof state.isLoading).toBe('boolean');
    expect(state.isLoading).toBe(false);
  });

  it('should update isLoading through action', () => {
    act(() => {
      useStore.getState().setIsLoading(true);
    });

    expect(useStore.getState().isLoading).toBe(true);
  });

  it('should reset state', () => {
    act(() => {
      useStore.getState().setIsLoading(true);
    });

    act(() => {
      useStore.getState().reset();
    });

    expect(useStore.getState().isLoading).toBe(false);
  });
});
