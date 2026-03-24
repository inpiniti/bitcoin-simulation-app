import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let _client = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[supabaseClient] 환경변수 미설정 - .env 파일에 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.');
    return null;
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

export const supabase = {
  from: (...args) => getSupabaseClient()?.from(...args),
  auth: { getSession: () => getSupabaseClient()?.auth.getSession() },
};

export default supabase;
