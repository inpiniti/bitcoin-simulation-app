/**
 * Gemini API 멀티키 로드 밸런서
 * 이슈 #21: 라운드 로빈 방식으로 여러 API 키를 순환 사용
 *
 * 환경변수: EXPO_PUBLIC_GEMINI_API_KEY
 *   - 쉼표 구분 여러 키: "key1,key2,key3"
 *   - 단일 키 (하위 호환): "key1"
 */

// 파싱된 키 목록 (모듈 레벨 상태)
const RAW = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const _keys = RAW.split(',')
  .map((k) => k.trim())
  .filter(Boolean);

// 현재 인덱스 (라운드 로빈용)
let _index = 0;

// 레이트 리밋된 키 → 해제 시각(ms) 맵
const _rateLimited = new Map();

/**
 * 사용 가능한 다음 Gemini API 키를 반환한다.
 * 모든 키가 레이트 리밋 상태면 가장 빨리 해제되는 키를 반환한다.
 * 키가 없으면 빈 문자열을 반환한다.
 * @returns {string}
 */
export function getNextKey() {
  if (_keys.length === 0) return '';

  const now = Date.now();

  // 레이트 리밋 만료 키 정리
  for (const [key, until] of _rateLimited.entries()) {
    if (now >= until) {
      _rateLimited.delete(key);
    }
  }

  // 라운드 로빈으로 사용 가능한 키 탐색
  let attempts = 0;
  while (attempts < _keys.length) {
    const key = _keys[_index % _keys.length];
    _index = (_index + 1) % _keys.length;
    attempts++;

    if (!_rateLimited.has(key)) {
      return key;
    }
  }

  // 모든 키가 레이트 리밋 상태: 가장 빨리 해제되는 키 반환
  let earliest = Infinity;
  let fallbackKey = _keys[0];
  for (const key of _keys) {
    const until = _rateLimited.get(key) ?? 0;
    if (until < earliest) {
      earliest = until;
      fallbackKey = key;
    }
  }
  return fallbackKey;
}

/**
 * 특정 키를 cooldownMs 동안 레이트 리밋 상태로 표시한다.
 * @param {string} key - 레이트 리밋할 API 키
 * @param {number} [cooldownMs=60000] - 쿨다운 시간 (밀리초)
 */
export function markRateLimited(key, cooldownMs = 60000) {
  if (!key) return;
  _rateLimited.set(key, Date.now() + cooldownMs);
}

/**
 * 등록된 키 개수 반환 (테스트/디버깅용)
 * @returns {number}
 */
export function getKeyCount() {
  return _keys.length;
}
