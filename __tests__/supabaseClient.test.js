// Mock supabase before import
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {},
    storage: {},
  })),
}));

describe('supabaseClient', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should export a supabase client', () => {
    // Set env vars
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { supabase } = require('../lib/supabaseClient');
    expect(supabase).toBeDefined();
  });

  it('should call createClient with env variables', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createClient } = require('@supabase/supabase-js');
    require('../lib/supabaseClient');

    expect(createClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
  });
});
