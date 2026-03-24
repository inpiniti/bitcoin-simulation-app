/**
 * geminiApi.js 단위 테스트
 * TDD: 테스트 먼저 작성
 */

const BACKEND_URL = 'https://younginpiniti-bitcoin-ai-backend.hf.space';

beforeEach(() => {
  global.fetch = jest.fn();
  jest.resetModules();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('askGemini', () => {
  it('메시지와 컨텍스트를 POST로 전송', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'AI 응답입니다' }),
    });

    const { askGemini } = require('../lib/geminiApi');
    await askGemini('테스트 메시지', '컨텍스트 정보');

    expect(global.fetch).toHaveBeenCalledWith(
      `${BACKEND_URL}/api/simple/gemini`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: '테스트 메시지', context: '컨텍스트 정보' }),
      })
    );
  });

  it('response 필드 응답 파싱', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'AI 응답입니다' }),
    });

    const { askGemini } = require('../lib/geminiApi');
    const result = await askGemini('질문');

    expect(result).toBe('AI 응답입니다');
  });

  it('text 필드 폴백 응답 파싱', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: '텍스트 응답' }),
    });

    const { askGemini } = require('../lib/geminiApi');
    const result = await askGemini('질문');

    expect(result).toBe('텍스트 응답');
  });

  it('context 기본값은 빈 문자열', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '응답' }),
    });

    const { askGemini } = require('../lib/geminiApi');
    await askGemini('질문만');

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.context).toBe('');
  });

  it('HTTP 에러 시 Error 던지기', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { askGemini } = require('../lib/geminiApi');
    await expect(askGemini('질문')).rejects.toThrow('HTTP 500');
  });

  it('네트워크 에러 시 Error 전파', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    const { askGemini } = require('../lib/geminiApi');
    await expect(askGemini('질문')).rejects.toThrow('Network Error');
  });
});
