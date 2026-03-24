/**
 * AI 채팅 화면 컴포넌트 테스트
 * TDD: 테스트 먼저 작성
 * 이슈 #9 (Gemini 채팅 UI), #10 (컨텍스트 연동), #11 (추천 질문 칩)
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock geminiApi
jest.mock('../lib/geminiApi', () => ({
  askGemini: jest.fn(),
}));

// Mock useStore (Zustand)
jest.mock('../store/useStore', () => ({
  useStore: jest.fn(() => ({
    serverStatus: 'online',
  })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock AsyncStorage
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

beforeEach(() => {
  jest.clearAllMocks();
});

const { askGemini } = require('../lib/geminiApi');

// ─── 이슈 #9: Gemini 채팅 UI ───────────────────────────────────────────────

describe('AIScreen - 빈 상태 UI', () => {
  it('"무엇이든 물어보세요" 안내 텍스트 렌더링', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    expect(getByTestId('empty-hint')).toBeTruthy();
  });

  it('메시지 입력창 렌더링', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    expect(getByTestId('message-input')).toBeTruthy();
  });

  it('전송 버튼 렌더링', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    expect(getByTestId('send-button')).toBeTruthy();
  });
});

describe('AIScreen - 메시지 버블', () => {
  it('메시지 전송 시 사용자 버블이 표시됨', async () => {
    askGemini.mockResolvedValueOnce('AI 응답입니다');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId, getByText } = render(<AIScreen />);

    const input = getByTestId('message-input');
    fireEvent.changeText(input, '안녕하세요');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByText('안녕하세요')).toBeTruthy();
    });
  });

  it('AI 응답 버블이 표시됨', async () => {
    askGemini.mockResolvedValueOnce('AI 응답입니다');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId, getByText } = render(<AIScreen />);

    const input = getByTestId('message-input');
    fireEvent.changeText(input, '안녕하세요');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByText('AI 응답입니다')).toBeTruthy();
    });
  });

  it('사용자 버블 testID 확인', async () => {
    askGemini.mockResolvedValueOnce('응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByTestId('bubble-user-0')).toBeTruthy();
    });
  });

  it('AI 버블 testID 확인', async () => {
    askGemini.mockResolvedValueOnce('AI 응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByTestId('bubble-ai-0')).toBeTruthy();
    });
  });

  it('전송 후 입력창 초기화', async () => {
    askGemini.mockResolvedValueOnce('응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    const input = getByTestId('message-input');
    fireEvent.changeText(input, '안녕');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('빈 입력으로는 전송 불가', async () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.press(getByTestId('send-button'));

    expect(askGemini).not.toHaveBeenCalled();
  });
});

describe('AIScreen - 로딩 인디케이터', () => {
  it('API 호출 중 로딩 인디케이터 표시', async () => {
    let resolveAsk;
    askGemini.mockImplementationOnce(
      () => new Promise((resolve) => { resolveAsk = resolve; })
    );

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    act(() => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByTestId('typing-indicator')).toBeTruthy();
    });

    await act(async () => {
      resolveAsk('응답');
    });
  });

  it('API 응답 후 로딩 인디케이터 사라짐', async () => {
    askGemini.mockResolvedValueOnce('응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId, queryByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(queryByTestId('typing-indicator')).toBeNull();
    });
  });
});

describe('AIScreen - API 에러 처리', () => {
  it('API 에러 시 에러 메시지 표시', async () => {
    askGemini.mockRejectedValueOnce(new Error('Network Error'));

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId, getByText } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(getByText(/오류|에러|error/i)).toBeTruthy();
    });
  });
});

// ─── 이슈 #10: 시장 컨텍스트 연동 ────────────────────────────────────────────

describe('AIScreen - 시장 컨텍스트', () => {
  it('Zustand store의 serverStatus를 컨텍스트로 전달', async () => {
    const { useStore } = require('../store/useStore');
    useStore.mockReturnValue({ serverStatus: 'online' });
    askGemini.mockResolvedValueOnce('응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '서버 상태는?');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(askGemini).toHaveBeenCalledWith(
        '서버 상태는?',
        expect.stringContaining('online')
      );
    });
  });

  it('serverStatus가 null이어도 에러 없이 동작', async () => {
    const { useStore } = require('../store/useStore');
    useStore.mockReturnValue({ serverStatus: null });
    askGemini.mockResolvedValueOnce('응답');

    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    fireEvent.changeText(getByTestId('message-input'), '질문');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    await waitFor(() => {
      expect(askGemini).toHaveBeenCalled();
    });
  });
});

// ─── 이슈 #11: 추천 질문 칩 UI ───────────────────────────────────────────────

describe('AIScreen - 추천 질문 칩', () => {
  it('추천 질문 칩 목록 렌더링', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByTestId } = render(<AIScreen />);

    expect(getByTestId('suggested-chips')).toBeTruthy();
  });

  it('"현재 백엔드 서버 상태는?" 칩 표시', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText } = render(<AIScreen />);

    expect(getByText('현재 백엔드 서버 상태는?')).toBeTruthy();
  });

  it('"자동매매 설정 요약해줘" 칩 표시', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText } = render(<AIScreen />);

    expect(getByText('자동매매 설정 요약해줘')).toBeTruthy();
  });

  it('"최근 매매 결과는?" 칩 표시', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText } = render(<AIScreen />);

    expect(getByText('최근 매매 결과는?')).toBeTruthy();
  });

  it('"딥러닝 모델 성능은?" 칩 표시', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText } = render(<AIScreen />);

    expect(getByText('딥러닝 모델 성능은?')).toBeTruthy();
  });

  it('칩 탭하면 입력창에 텍스트 채워짐', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText, getByTestId } = render(<AIScreen />);

    fireEvent.press(getByText('현재 백엔드 서버 상태는?'));

    const input = getByTestId('message-input');
    expect(input.props.value).toBe('현재 백엔드 서버 상태는?');
  });

  it('칩 탭 후 다른 칩을 탭하면 입력창 텍스트 교체', () => {
    const AIScreen = require('../app/(tabs)/ai').default;
    const { getByText, getByTestId } = render(<AIScreen />);

    fireEvent.press(getByText('현재 백엔드 서버 상태는?'));
    fireEvent.press(getByText('자동매매 설정 요약해줘'));

    const input = getByTestId('message-input');
    expect(input.props.value).toBe('자동매매 설정 요약해줘');
  });
});
