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

/**
 * supabase 클라이언트 미초기화 시 체이닝 가능한 null-safe 객체 반환.
 * 모든 쿼리 메서드를 체이닝 후 await 하면 { data: null, error: { message } } 반환.
 */
function makeNullChain(errorMsg) {
  const settled = Promise.resolve({ data: null, error: { message: errorMsg } });
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    upsert: () => chain,
    eq: () => chain,
    neq: () => chain,
    gt: () => chain,
    gte: () => chain,
    lt: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    in: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    then: (resolve, reject) => settled.then(resolve, reject),
    catch: (fn) => settled.catch(fn),
    finally: (fn) => settled.finally(fn),
  };
  return chain;
}

export const supabase = {
  from: (...args) => {
    const client = getSupabaseClient();
    if (!client) return makeNullChain('Supabase 환경변수 미설정');
    return client.from(...args);
  },
  auth: {
    getSession: () =>
      getSupabaseClient()?.auth.getSession() ??
      Promise.resolve({ data: { session: null }, error: null }),
  },
};

export default supabase;
