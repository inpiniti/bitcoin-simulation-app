# Bitcoin Simulation App — 리디자인 계획서

> 이 문서는 개발 참고용 설계 명세서입니다. 개발 진행에 따라 업데이트합니다.

---

## 1. 전체 방향

기존의 서버상태, 딥러닝스튜디오, 자동매매설정 구조를 제거하고,  
**사용자 중심의 4탭 구조**로 전면 재편합니다.

뉴스, AI챗, 서버상태 탭은 제거합니다.

---

## 2. 탭 구조

| 탭 | 파일 | 아이콘 | 설명 |
|---|---|---|---|
| 계좌 | `app/(tabs)/account.jsx` | Wallet | 보유잔고 + 예수금 |
| 모델 | `app/(tabs)/model.jsx` | Brain | 예측 + 학습 |
| 예약 | `app/(tabs)/schedule.jsx` | Clock | 설정 + 로그 |
| 티커 | `app/(tabs)/ticker.jsx` | BarChart2 | 목록 + 매수 |

---

## 3. 화면별 상세 명세

---

### 3-1. 계좌 탭 (`account.jsx`)

**목적**: KIS API 연동 계좌 현황 확인 및 주문

**상단**: 예수금(주문가능금액) 표시
```
예수금  ₩12,345,678
```

**보유잔고 목록** (종목별 카드):
```
[로고] 삼성전자  005930
       수익률  +3.24%   (수익이면 빨강, 손실이면 초록)
       구매가  ₩72,000
       현재가  ₩74,330
       [매도]  [매수]
```

**필드 정의**:
- `logo`: 종목 로고 이미지 (없으면 티커 이니셜 뱃지)
- `ticker`: 종목코드 (예: 005930)
- `name`: 종목명 (예: 삼성전자)
- `profit_rate`: 수익률 % (양수=빨강, 음수=초록 — 한국 증시 관행)
- `avg_price`: 평균 구매가
- `current_price`: 현재가
- 매도/매수 버튼: 탭 시 수량 입력 모달 → 주문 실행

**API**: KIS 잔고 조회 (`/kis/balance`), 주문 (`/kis/order`)

---

### 3-2. 모델 탭 (`model.jsx`)

**목적**: ML 모델 예측 실행 및 학습 실행

**내부 탭 2개**: `예측` | `학습`

#### 예측 서브탭
```
시장    [KOSPI ▼]
기간    [30일 ▼]   (7일 / 14일 / 30일 / 60일)

[예측하기]

결과:
티커      신호      매수확률   매도확률
AAPL     BUY       0.82       0.18
005930   HOLD      0.51       0.49
```

**필드**:
- `market`: 시장 선택 (KOSPI, KOSDAQ, NASDAQ, NYSE 등)
- `period`: 학습 기간 선택 (7 / 14 / 30 / 60일)
- 결과 테이블: ticker, signal, buy_probability, sell_probability

**API**: `POST /v1/xgb/predict` (기존 xgbApi.js 활용)

#### 학습 서브탭
```
시장    [KOSPI ▼]
기간    [30일 ▼]

[학습하기]

진행률  ████░░░░  45%
로그:
[09:12:01] Feature engineering...
[09:12:05] Training fold 2/5...
```

**필드**:
- `market`: 시장 선택
- `period`: 기간 선택
- 진행률 바 + 실시간 로그 (WebSocket)

**API**: `WS wss://.../ws/train` (기존 xgbApi.js 활용)

---

### 3-3. 예약 탭 (`schedule.jsx`)

**목적**: 자동매매 예약 설정 및 실행 로그 확인

**내부 탭 2개**: `설정` | `로그`

#### 설정 서브탭
```
시장        [KOSPI ▼]
기간        [30일 ▼]
모델        [XGBoost ▼]
매수 임계값  [0.7 ▼]    (예: 매수확률 70% 이상이면 매수)
매도 임계값  [0.6 ▼]    (예: 매도확률 60% 이상이면 매도)

[저장]  [자동매매 ON/OFF 토글]
```

**필드**:
- `market`: 시장
- `period`: 기간 (7 / 14 / 30 / 60일)
- `model`: 사용할 모델 (XGBoost, 향후 확장 가능)
- `buy_threshold`: 매수 퍼센트 (0.0 ~ 1.0, 슬라이더 또는 드롭다운)
- `sell_threshold`: 매도 퍼센트 (0.0 ~ 1.0)
- 활성화 토글 (`is_active`)

**API**: Supabase `automation_settings` CRUD (기존 tradingApi.js 활용)

#### 로그 서브탭
```
2026-04-10 09:15  005930  매수확률 0.82
2026-04-10 09:15  AAPL    매도확률 0.63
2026-04-09 09:10  035720  매수확률 0.74
```

**필드**:
- `created_at`: 날짜/시간
- `ticker`: 종목코드
- `probability`: 확률값 (매수/매도 구분 뱃지 포함)

**API**: Supabase `automation_trade_logs` 조회 (기존 tradingApi.js 활용)

---

### 3-4. 티커 탭 (`ticker.jsx`)

**목적**: 관심 종목 목록 확인 및 즉시 매수

**목록 형태** (스크롤 가능):
```
[로고]  삼성전자   005930
        오늘 +1.23%         현재가  ₩74,330
        [매수]

[로고]  카카오      035720
        오늘 -0.55%         현재가  ₩52,100
        [매수]
```

**필드**:
- `logo`: 종목 로고
- `name`: 종목명
- `ticker`: 종목코드
- `today_rate`: 오늘 수익률 % (양수=빨강, 음수=초록)
- `current_price`: 현재가
- 매수 버튼: 탭 시 수량 입력 모달 → 주문 실행

**API**: 
- 종목 목록: Supabase `ticker_group` 또는 백엔드 `/tickers`
- 현재가: KIS API 또는 백엔드 시세 엔드포인트
- 매수 주문: KIS `/kis/order`

---

## 4. 공통 UI 규칙

### 수익률 색상 (한국 증시 관행)
- 양수(상승) → `signalBuy` = `#f23645` (빨강)
- 음수(하락) → `signalSell` = `#089981` (초록)

### 금액 포맷
- 원화: `₩1,234,567` (천단위 콤마)
- 확률: `0.82` 또는 `82%` 중 화면에 맞게

### 내부 탭 (서브탭)
- 탭 전환은 상단 세그먼트 컨트롤 스타일 (`예측 | 학습` 등)
- 기존 `Card`, `Badge`, `Button` 컴포넌트 재활용

### 로딩 / 에러
- 로딩: ActivityIndicator 중앙 표시
- 에러: 빨간 텍스트 + 재시도 버튼

---

## 5. 파일 변경 계획

### 삭제
- `app/(tabs)/server.jsx`
- `app/(tabs)/ai.jsx`
- `app/(tabs)/news.jsx`
- `app/news/[id].jsx`
- `lib/backendApi.js`
- `lib/newsApi.js`
- `lib/geminiApi.js`
- `store/useNewsStore.js`

### 신규 생성
- `app/(tabs)/account.jsx` — 계좌 탭
- `app/(tabs)/model.jsx` — 모델 탭
- `app/(tabs)/schedule.jsx` — 예약 탭
- `app/(tabs)/ticker.jsx` — 티커 탭
- `lib/kisApi.js` — KIS 잔고/주문 API

### 수정
- `app/(tabs)/_layout.jsx` — 4탭으로 교체
- `app/index.jsx` — 기본 탭을 `account`로 변경
- `store/useStore.js` — 불필요한 상태 정리

### 유지
- `lib/tradingApi.js` — 예약 설정/로그 (Supabase)
- `lib/xgbApi.js` — 예측/학습 API
- `lib/supabaseClient.js`
- `components/ui/` — Card, Badge, Button 그대로 사용
- `constants/colors.js`

---

## 6. 개발 순서 (권장)

1. `_layout.jsx` 탭 구조 교체 (4탭)
2. `ticker.jsx` — 가장 단순, 먼저 구현
3. `model.jsx` — 기존 xgbApi.js 재활용
4. `schedule.jsx` — 기존 tradingApi.js 재활용
5. `account.jsx` — KIS API 연동 필요 (kisApi.js 신규)
6. 불필요한 파일 삭제 및 정리

---

## 7. 미결 사항 (개발 전 확인 필요)

- [ ] KIS API 엔드포인트 — 백엔드(`bitcoin-ai-backend`)에 `/kis/balance`, `/kis/order` 있는지 확인
- [ ] 관심 종목 목록 소스 — Supabase 테이블인지 백엔드 설정인지 확인
- [ ] 현재가 조회 방식 — KIS 실시간 or 백엔드 polling
- [ ] 로고 이미지 소스 — 외부 CDN 사용 여부 (없으면 이니셜 뱃지로 대체)
- [ ] `market` 선택지 — KOSPI / KOSDAQ / NASDAQ / NYSE 고정값 or 동적
