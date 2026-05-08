# Bitcoin Simulation App — 리디자인 계획서

> 이 문서는 개발 참고용 설계 명세서입니다. 개발 진행에 따라 업데이트합니다.

---

## 1. 전체 방향

기존의 서버상태, 딥러닝스튜디오, 자동매매설정 구조를 제거하고,  
**사용자 중심의 4탭 구조**로 전면 재편합니다.

뉴스, AI챗, 서버상태 탭은 제거합니다.

---

## 2. 탭 구조

| 탭   | 파일                      | 아이콘    | 설명              |
| ---- | ------------------------- | --------- | ----------------- |
| 계좌 | `app/(tabs)/account.jsx`  | Wallet    | 보유잔고 + 예수금 |
| 모델 | `app/(tabs)/model.jsx`    | Brain     | 예측 + 학습       |
| 예약 | `app/(tabs)/schedule.jsx` | Clock     | 설정 + 로그       |
| 포트폴리오 | `app/(tabs)/portfolio.jsx` | PieChart | 목록 + 제안       |

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

### 3-4. 포트폴리오 탭 (`portfolio.jsx`)

**목적**: 투자자 데이터 기반 자산 배분 제안 및 권장 매수 수량 확인

**주요 기능**:
- **자산 배분 제안**: 총자산 입력 시 투자자들의 평균 비중을 바탕으로 종목별 권장 수량 자동 계산
- **Tweak 패널**: 종목 수, 현금 비중, 가중치 기준(투자자 수/비중 합계) 실시간 조정
- **뷰 모드**: '종목별 비중' (권장 수량 확인) 및 '투자자별 목록' 전환

**필드**:
- `totalAssets`: 운용 자산 (직접 입력)
- `tickerCount`: 추천 종목 수 (5~50개 조절)
- `cashRatio`: 현금 보유 비중 (0~50% 조절)
- `weightMode`: 가중치 계산 방식 (투자자 수 기반 vs 비중 합계 기반)

**API**: 
- 백엔드 `/portfolio?withDetails=true` 조회
- 데이터 부재 시 `lib/portfolioData.js` 샘플 데이터 활용

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
- `app/(tabs)/portfolio.jsx` — 포트폴리오 탭
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

## 7. ML 학습 및 예측 흐름

> 상세 문서: [docs/ml-flow.md](docs/ml-flow.md)

### 빠른 요약

- **학습**: `app/train.jsx` → WebSocket `/ws/train` → 수집(yfinance) → 전처리 → XGBoost 저장
- **예측**: `app/predict.jsx` → REST `/v1/xgb/predict` → 수집 → 전처리 → 날짜별 확률 반환
- **전처리 AS-IS**: 피처 4개 (consecutiveDays, change1d, change7d, change30d)
- **전처리 TO-BE**: 2의 거듭제곱 간격 (1~1024 거래일), 11단계 Stage 시스템 도입 예정

## 8. 미결 사항 (개발 전 확인 필요)

- [ ] KIS API 엔드포인트 — 백엔드(`bitcoin-ai-backend`)에 `/kis/balance`, `/kis/order` 있는지 확인
- [ ] 관심 종목 목록 소스 — Supabase 테이블인지 백엔드 설정인지 확인
- [ ] 현재가 조회 방식 — KIS 실시간 or 백엔드 polling
- [ ] 로고 이미지 소스 — 외부 CDN 사용 여부 (없으면 이니셜 뱃지로 대체)
- [ ] `market` 선택지 — KOSPI / KOSDAQ / NASDAQ / NYSE 고정값 or 동적

## 8. 뉴스 파이프 라인

1.  google, yhaoo 뉴스 크롤링
2.  뉴스를 gpt에게 전달하기 위한 작업
3.  gemini에게 분석
4.  신뢰도가 50이상이면서, 낙관적인 종목에 한해서만

        4-1. 종목별로 XGBoost % 추가
        4-2. 종목별로 강화학습 % 추가
        4-3. 종목별로 TimesFM 예측 추가
        4-4. 종목별로 amazon/chronos-2 예측추가
        4-5. 종목별로 Salesforce/moirai-moe-1.0-R-base 예측추가
        4-6(A). Reddit & Stocktwits: 커뮤니티형 소문 (집단 지성과 밈 분석)
        4-6(B). Yahoo Finance: 포털형 토론 (대중적인 매수/매도 심리)
        4-6(C). X (Twitter): 실시간 전파형 소문 (전문가 및 속보성 루머)
        4-7. 종목별 토론 분석추가

5.  결과를 db에 저장 (4,5,6도 추가하여)
