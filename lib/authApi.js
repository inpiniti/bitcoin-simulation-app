/**
 * 멀티유저 인증 API
 *
 * 백엔드 /auth/kis-login으로 KIS 자격증명을 보내면:
 *   - KIS 토큰 발급으로 본인 인증
 *   - 계좌번호 기반 user_id에 대한 Supabase RLS용 JWT 발급
 *   - kis_credentials / websocket_keys 저장(서버 자동매매·감지용)도 백엔드가 처리
 *
 * 발급받은 JWT/user_id는 AsyncStorage에 저장하고, supabaseClient의 accessToken
 * 콜백이 JWT를 읽어 모든 Supabase 요청에 사용한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_JWT_KEY } from './supabaseClient';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://younginpiniti-bitcoin-ai-backend.hf.space';

export const AUTH_USER_ID_KEY = 'auth.user_id.v1';

/**
 * KIS 자격증명으로 로그인 → JWT/user_id 발급 및 저장
 * @param {{ accountNo: string, appkey: string, appsecret: string }} cred
 * @returns {{ data: { user_id, access_token, account_no }|null, error: object|null }}
 */
export async function kisLogin({ accountNo, appkey, appsecret }) {
  try {
    const resp = await fetch(`${API_BASE}/auth/kis-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_no: accountNo, appkey, appsecret }),
    });

    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_e) {
      data = null;
    }

    if (!resp.ok) {
      const message = data?.detail || `로그인 실패 (HTTP ${resp.status})`;
      return { data: null, error: { message } };
    }

    if (!data?.access_token || !data?.user_id) {
      return { data: null, error: { message: '서버 응답에 인증 토큰이 없습니다.' } };
    }

    await AsyncStorage.multiSet([
      [AUTH_JWT_KEY, data.access_token],
      [AUTH_USER_ID_KEY, data.user_id],
    ]);

    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message || '로그인 요청 중 오류' } };
  }
}

/** 저장된 인증 토큰/사용자 ID 삭제 (게스트 전환·로그아웃 시) */
export async function clearAuth() {
  try {
    await AsyncStorage.multiRemove([AUTH_JWT_KEY, AUTH_USER_ID_KEY]);
  } catch (_e) {
    // 무시
  }
}

/** 저장된 user_id 조회 (insert 시 소유자 기록용) */
export async function getStoredUserId() {
  try {
    return await AsyncStorage.getItem(AUTH_USER_ID_KEY);
  } catch (_e) {
    return null;
  }
}

/** 저장된 JWT 조회 (백엔드 API 호출 Authorization 헤더 / WS token용) */
export async function getStoredJwt() {
  try {
    return await AsyncStorage.getItem(AUTH_JWT_KEY);
  } catch (_e) {
    return null;
  }
}
