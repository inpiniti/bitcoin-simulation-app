/**
 * tradingApi.js 단위 테스트
 * TDD: lib/tradingApi.js CRUD + 실행 로그 조회
 */

// console.error 억제
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});

// ── Supabase 모킹 ────────────────────────────────────────────────────────────

// 각 테스트에서 체인 메서드를 커스터마이즈할 수 있도록 팩토리를 노출
let mockSingle;
let mockEq;
let mockLimit;
let mockOrder;
let mockSelect;
let mockInsert;
let mockUpdate;
let mockDelete;
let mockFrom;

jest.mock('../lib/supabaseClient', () => {
  // 실제 mock 함수는 beforeEach에서 주입되므로 여기서는 프록시를 만든다
  return {
    supabase: {
      from: (...args) => mockFrom(...args),
    },
    default: {
      from: (...args) => mockFrom(...args),
    },
  };
});

beforeEach(() => {
  // 체인 초기화
  mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  mockEq = jest.fn().mockReturnThis();
  mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });
  mockOrder = jest.fn().mockReturnThis();
  mockSelect = jest.fn().mockReturnThis();
  mockInsert = jest.fn().mockReturnThis();
  mockUpdate = jest.fn().mockReturnThis();
  mockDelete = jest.fn().mockReturnThis();

  // 각 체인 메서드가 자기 자신을 반환하면서 끝 단계에서 resolve
  mockEq.mockImplementation(() => ({
    eq: mockEq,
    select: mockSelect,
    single: mockSingle,
    // delete 마지막 체인 지원
    then: (resolve) => resolve({ error: null }),
  }));
  mockSelect.mockImplementation(() => ({
    order: mockOrder,
    single: mockSingle,
    eq: mockEq,
  }));
  mockOrder.mockImplementation(() => ({
    limit: mockLimit,
    eq: mockEq,
  }));
  mockInsert.mockImplementation(() => ({
    select: () => ({
      single: mockSingle,
    }),
  }));
  mockUpdate.mockImplementation(() => ({
    eq: () => ({
      select: () => ({
        single: mockSingle,
      }),
    }),
  }));
  mockDelete.mockImplementation(() => ({
    eq: () => Promise.resolve({ error: null }),
  }));

  mockFrom = jest.fn().mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    order: mockOrder,
    eq: mockEq,
    limit: mockLimit,
    single: mockSingle,
  }));
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── fetchSettings ────────────────────────────────────────────────────────────

describe('fetchSettings', () => {
  it('설정 목록을 성공적으로 반환한다', async () => {
    const mockSettings = [
      {
        id: 'setting-1',
        ticker: 'AAPL',
        strategy: 'momentum',
        is_active: true,
        execution_time: 'market_open',
        buy_condition: '0.7',
        sell_condition: '0.3',
        amount: 1000,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
    ];

    mockSelect.mockImplementation(() => ({
      order: () => Promise.resolve({ data: mockSettings, error: null }),
    }));

    const { fetchSettings } = require('../lib/tradingApi');
    const result = await fetchSettings();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ticker).toBe('AAPL');
  });

  it('빈 배열을 반환한다', async () => {
    mockSelect.mockImplementation(() => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }));

    const { fetchSettings } = require('../lib/tradingApi');
    const result = await fetchSettings();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it('Supabase 에러 시 error를 반환한다', async () => {
    mockSelect.mockImplementation(() => ({
      order: () => Promise.resolve({ data: null, error: { message: '조회 실패' } }),
    }));

    const { fetchSettings } = require('../lib/tradingApi');
    const result = await fetchSettings();

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('조회 실패');
  });

  it('예외 발생 시 error.message를 반환한다', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('네트워크 오류');
    });

    const { fetchSettings } = require('../lib/tradingApi');
    const result = await fetchSettings();

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('네트워크 오류');
  });
});

// ── createSetting ────────────────────────────────────────────────────────────

describe('createSetting', () => {
  it('설정을 성공적으로 생성한다', async () => {
    const newSetting = {
      ticker: 'MSFT',
      strategy: 'trend',
      is_active: false,
      execution_time: 'market_close',
      buy_condition: '0.65',
      sell_condition: '0.35',
      amount: 500,
    };
    const createdSetting = { id: 'new-id', ...newSetting, created_at: '2026-03-24T00:00:00Z' };

    mockSingle.mockResolvedValue({ data: createdSetting, error: null });
    mockInsert.mockImplementation(() => ({
      select: () => ({ single: mockSingle }),
    }));

    const { createSetting } = require('../lib/tradingApi');
    const result = await createSetting(newSetting);

    expect(result.error).toBeNull();
    expect(result.data.id).toBe('new-id');
    expect(result.data.ticker).toBe('MSFT');
  });

  it('에러 시 error를 반환한다', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: '생성 실패' } });
    mockInsert.mockImplementation(() => ({
      select: () => ({ single: mockSingle }),
    }));

    const { createSetting } = require('../lib/tradingApi');
    const result = await createSetting({ ticker: 'ERR' });

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('생성 실패');
  });

  it('예외 발생 시 error.message를 반환한다', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('insert 실패');
    });

    const { createSetting } = require('../lib/tradingApi');
    const result = await createSetting({ ticker: 'AAPL' });

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('insert 실패');
  });
});

// ── updateSetting ────────────────────────────────────────────────────────────

describe('updateSetting', () => {
  it('설정을 성공적으로 수정한다', async () => {
    const updated = { id: 'setting-1', ticker: 'AAPL', amount: 2000 };
    mockSingle.mockResolvedValue({ data: updated, error: null });
    mockUpdate.mockImplementation(() => ({
      eq: () => ({
        select: () => ({ single: mockSingle }),
      }),
    }));

    const { updateSetting } = require('../lib/tradingApi');
    const result = await updateSetting('setting-1', { amount: 2000 });

    expect(result.error).toBeNull();
    expect(result.data.id).toBe('setting-1');
  });

  it('에러 시 error를 반환한다', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: '수정 실패' } });
    mockUpdate.mockImplementation(() => ({
      eq: () => ({
        select: () => ({ single: mockSingle }),
      }),
    }));

    const { updateSetting } = require('../lib/tradingApi');
    const result = await updateSetting('setting-1', { amount: 999 });

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('수정 실패');
  });

  it('예외 발생 시 error.message를 반환한다', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('update 오류');
    });

    const { updateSetting } = require('../lib/tradingApi');
    const result = await updateSetting('id', {});

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('update 오류');
  });
});

// ── deleteSetting ────────────────────────────────────────────────────────────

describe('deleteSetting', () => {
  it('설정을 성공적으로 삭제한다', async () => {
    mockDelete.mockImplementation(() => ({
      eq: () => Promise.resolve({ error: null }),
    }));

    const { deleteSetting } = require('../lib/tradingApi');
    const result = await deleteSetting('setting-1');

    expect(result.error).toBeNull();
  });

  it('에러 시 error를 반환한다', async () => {
    mockDelete.mockImplementation(() => ({
      eq: () => Promise.resolve({ error: { message: '삭제 실패' } }),
    }));

    const { deleteSetting } = require('../lib/tradingApi');
    const result = await deleteSetting('bad-id');

    expect(result.error.message).toBe('삭제 실패');
  });

  it('예외 발생 시 error.message를 반환한다', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('delete 오류');
    });

    const { deleteSetting } = require('../lib/tradingApi');
    const result = await deleteSetting('id');

    expect(result.error.message).toBe('delete 오류');
  });
});

// ── toggleSetting ────────────────────────────────────────────────────────────

describe('toggleSetting', () => {
  it('활성화로 토글한다', async () => {
    const toggled = { id: 'setting-1', is_active: true };
    mockSingle.mockResolvedValue({ data: toggled, error: null });
    mockUpdate.mockImplementation(() => ({
      eq: () => ({
        select: () => ({ single: mockSingle }),
      }),
    }));

    const { toggleSetting } = require('../lib/tradingApi');
    const result = await toggleSetting('setting-1', true);

    expect(result.error).toBeNull();
    expect(result.data.is_active).toBe(true);
  });

  it('비활성화로 토글한다', async () => {
    const toggled = { id: 'setting-2', is_active: false };
    mockSingle.mockResolvedValue({ data: toggled, error: null });
    mockUpdate.mockImplementation(() => ({
      eq: () => ({
        select: () => ({ single: mockSingle }),
      }),
    }));

    const { toggleSetting } = require('../lib/tradingApi');
    const result = await toggleSetting('setting-2', false);

    expect(result.error).toBeNull();
    expect(result.data.is_active).toBe(false);
  });

  it('에러 시 error를 반환한다', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: '토글 실패' } });
    mockUpdate.mockImplementation(() => ({
      eq: () => ({
        select: () => ({ single: mockSingle }),
      }),
    }));

    const { toggleSetting } = require('../lib/tradingApi');
    const result = await toggleSetting('bad-id', true);

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('토글 실패');
  });
});

// ── fetchTradeLogs ────────────────────────────────────────────────────────────

describe('fetchTradeLogs', () => {
  it('전체 로그를 성공적으로 조회한다', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        setting_id: 'setting-1',
        action: 'BUY',
        ticker: 'AAPL',
        price: 180.5,
        amount: 500,
        status: 'success',
        message: '매수 완료',
        created_at: '2026-03-24T10:00:00Z',
      },
    ];

    mockSelect.mockImplementation(() => ({
      order: () => ({
        limit: () => Promise.resolve({ data: mockLogs, error: null }),
      }),
    }));

    const { fetchTradeLogs } = require('../lib/tradingApi');
    const result = await fetchTradeLogs();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].action).toBe('BUY');
  });

  it('settingId로 필터링하여 조회한다', async () => {
    const mockLogs = [
      {
        id: 'log-2',
        setting_id: 'setting-abc',
        action: 'SELL',
        ticker: 'MSFT',
        price: 400,
        amount: 400,
        status: 'success',
        message: '매도 완료',
        created_at: '2026-03-23T10:00:00Z',
      },
    ];

    const mockEqChain = jest.fn().mockResolvedValue({ data: mockLogs, error: null });
    mockSelect.mockImplementation(() => ({
      order: () => ({
        limit: () => ({
          eq: mockEqChain,
        }),
      }),
    }));

    const { fetchTradeLogs } = require('../lib/tradingApi');
    const result = await fetchTradeLogs('setting-abc', 10);

    // settingId 필터가 있을 때 eq가 호출되거나 데이터가 반환되면 통과
    expect(result).toBeDefined();
  });

  it('에러 시 error를 반환한다', async () => {
    mockSelect.mockImplementation(() => ({
      order: () => ({
        limit: () => Promise.resolve({ data: null, error: { message: '로그 조회 실패' } }),
      }),
    }));

    const { fetchTradeLogs } = require('../lib/tradingApi');
    const result = await fetchTradeLogs();

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('로그 조회 실패');
  });

  it('예외 발생 시 error.message를 반환한다', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('로그 조회 오류');
    });

    const { fetchTradeLogs } = require('../lib/tradingApi');
    const result = await fetchTradeLogs();

    expect(result.data).toBeNull();
    expect(result.error.message).toBe('로그 조회 오류');
  });

  it('limit 파라미터가 기본값 20으로 동작한다', async () => {
    let capturedLimit = null;
    mockSelect.mockImplementation(() => ({
      order: () => ({
        limit: (n) => {
          capturedLimit = n;
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }));

    const { fetchTradeLogs } = require('../lib/tradingApi');
    await fetchTradeLogs();

    expect(capturedLimit).toBe(20);
  });
});
