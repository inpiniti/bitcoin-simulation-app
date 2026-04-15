# ML 학습 및 예측 흐름

> 백엔드: `bitcoin-ai-backend` / 앱: `app/train.jsx`, `app/predict.jsx`, `lib/xgbApi.js`

---

## 1. 전체 흐름 요약

```
[앱: 학습]                        [앱: 예측]
train.jsx                          predict.jsx
    │                                  │
    │  WebSocket                       │  REST POST
    ▼                                  ▼
/ws/train                         /v1/xgb/predict
    │                                  │
    ├─ 1. 수집 (yfinance)              ├─ 1. 모델 로드 (Supabase)
    ├─ 2. 전처리 (피처 생성)           ├─ 2. 수집 (yfinance)
    ├─ 3. XGBoost 학습                 ├─ 3. 전처리 (피처 생성)
    └─ 4. 저장 (Supabase)             └─ 4. predict → 날짜별 확률
```

---

## 2. 앱 파라미터

### 학습 (`app/train.jsx` → WebSocket)

```json
{
  "group":     "sp500",          // 그룹: sp500 | qqq | usall | kospi200 | kosdaq150
  "ticker":    "AAPL",           // 단일 종목 (group과 택일)
  "period":    365,              // 학습 기간(일): 30 | 90 | 180 | 365
  "modelName": "XGB_sp500_365d"  // 자동 생성
}
```

### 예측 (`app/predict.jsx` → REST POST)

```json
{
  "modelId": "uuid",   // Supabase ml_models 테이블 ID
  "ticker":  "AAPL",  // 단일 종목
  "days":    60        // 60(기본) | 730(전체 과거 내역)
}
```

> 그룹 예측은 앱 내 `GROUP_TICKERS` 하드코딩 목록으로 종목별 순차 호출

---

## 3. 전처리 — AS-IS (현재 구현)

**파일**: `services/data_collector.py` — `process_stock_data_for_ml()` / `process_stock_data_for_prediction()`

### 피처 (X) — 4개

| 변수명 | 설명 | 계산식 |
|--------|------|--------|
| `consecutiveDays` | 연속 상승/하락일 수 | 상승이면 +N일, 하락이면 −N일, 보합=0 |
| `change1d`  | 1일 변동률%  | `(오늘 − 1일전) / 1일전 × 100` |
| `change7d`  | 7일 변동률%  | `(오늘 − 7일전) / 7일전 × 100` |
| `change30d` | 30일 변동률% | `(오늘 − 30일전) / 30일전 × 100` |

피처 배열 순서: `[consecutiveDays, change1d, change7d, change30d]`

### 레이블 (Y) — 학습 전용

```
다음날변동률% = (내일종가 − 오늘종가) / 오늘종가 × 100
Y = 1  if  다음날변동률% >= 2.0%
Y = 0  otherwise
```

### 데이터 요구사항

- 인덱스 30번째 캔들부터 사용 (change30d 계산에 30 거래일 필요)
- 마지막 캔들은 Y 없음 → 학습 제외, 예측 사용

### 문제점

- 1, 7, 30이라는 간격에 일관된 규칙이 없음
- 중간 구간 (2일, 4일, 14일, 60일 등) 신호 누락
- 장기 추세(수백 일)를 전혀 반영 못함

---

## 4. 전처리 — TO-BE (목표 설계)

### 핵심 아이디어

간격을 **2의 거듭제곱**으로 통일: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024일

- 단기(1~8일): 최근 모멘텀
- 중기(16~128일): 분기 추세
- 장기(256~1024일): 연간·다년 추세

### 피처 (X) — 최대 12개

| # | 변수명 | 설명 |
|---|--------|------|
| 0 | `consecutiveDays` | 연속 상승/하락일 수 (AS-IS와 동일) |
| 1 | `change1d`   | 1 거래일 변동률%   |
| 2 | `change2d`   | 2 거래일 변동률%   |
| 3 | `change4d`   | 4 거래일 변동률%   |
| 4 | `change8d`   | 8 거래일 변동률%   |
| 5 | `change16d`  | 16 거래일 변동률%  |
| 6 | `change32d`  | 32 거래일 변동률%  |
| 7 | `change64d`  | 64 거래일 변동률%  |
| 8 | `change128d` | 128 거래일 변동률% |
| 9 | `change256d` | 256 거래일 변동률% |
| 10 | `change512d` | 512 거래일 변동률% |
| 11 | `change1024d` | 1024 거래일 변동률% |

> 모든 변동률 계산식: `(오늘종가 − N거래일전종가) / N거래일전종가 × 100`  
> 단, 거래일(영업일) 기준이므로 캘린더 기준보다 실제 일수가 더 많이 필요함

### 단계(Stage) 시스템

데이터가 충분하지 않은 종목도 가능한 만큼의 피처로 학습할 수 있도록 단계 옵션을 제공:

| 단계 | 사용 피처 | 필요 거래일(최소) | 필요 캘린더(약) |
|------|-----------|-----------------|----------------|
| 1단계 | consecutiveDays, change1d | ~50일  | ~2.5개월 |
| 2단계 | + change2d               | ~50일  | ~2.5개월 |
| 3단계 | + change4d               | ~100일 | ~5개월   |
| 4단계 | + change8d               | ~100일 | ~5개월   |
| 5단계 | + change16d              | ~200일 | ~1년     |
| 6단계 | + change32d              | ~200일 | ~1년     |
| 7단계 | + change64d              | ~400일 | ~2년     |
| 8단계 | + change128d             | ~400일 | ~2년     |
| 9단계 | + change256d             | ~600일 | ~2.5년   |
| 10단계 | + change512d            | ~900일 | ~3.5년   |
| 11단계 | + change1024d           | ~1400일| ~5.5년   |

> 필요 거래일 = 피처 최대 lookback + 학습에 충분한 행 수(~200행 이상)  
> 예: 11단계는 1024거래일 lookback + 200행 → **약 1224 거래일 ≈ 5~5.5 캘린더년** 필요

### 학습 vs 예측 데이터 요구량 차이

| 구분 | 학습 | 예측 |
|------|------|------|
| 필요량 | lookback + 충분한 행 수(Y 포함) | lookback만 (최신 1행 예측) |
| 예시(11단계) | 1024 + 200 = ~1224 거래일 | 1024 거래일 |
| yfinance 요청 기간 | **단계별로 자동 산출** | 단계에 맞춰 최소 lookback만 |
| 비는 필드 처리 | **해당 행 제거** (NaN row drop) | 최신 행 1개만 필요하므로 문제 없음 |

### 전처리 의사코드 (TO-BE)

```python
STAGES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]

def process_stock_data(candles, stage: int):
    """
    stage: 1~11 (사용할 피처 단계)
    candles: 일별 OHLCV 리스트 (거래일 기준, 오래된 것부터 정렬)
    """
    lookbacks = STAGES[:stage]          # 사용할 lookback 목록
    max_lookback = max(lookbacks)       # 가장 먼 lookback
    rows = []

    for i in range(max_lookback, len(candles) - 1):  # -1: Y 계산용 다음날 필요
        today = candles[i]

        # consecutiveDays
        consecutive = calc_consecutive_days(candles, i)

        # 변동률 피처
        changes = []
        valid = True
        for lb in lookbacks:
            ref = candles[i - lb]
            if ref['close'] == 0:
                valid = False
                break
            change = (today['close'] - ref['close']) / ref['close'] * 100
            changes.append(round(change, 2))

        if not valid:
            continue  # NaN 행 제거

        # Y 레이블
        tomorrow = candles[i + 1]
        next_change = (tomorrow['close'] - today['close']) / today['close'] * 100
        y = 1 if next_change > 0 else 0

        rows.append({
            'features': [consecutive] + changes,
            'label': y,
            'date': today['date']
        })

    return rows
```

### 학습 데이터 수집 요청량 (단계별)

```python
def required_calendar_days_for_training(stage: int, min_rows: int = 200) -> int:
    """
    학습에 필요한 캘린더 일수 추정
    거래일 = 캘린더일 × (250/365) 비율 역산
    """
    max_lookback_trading = STAGES[stage - 1]
    total_trading = max_lookback_trading + min_rows
    calendar_days = int(total_trading * (365 / 250)) + 30  # 여유 +30일
    return calendar_days

# 예: 11단계 → (1024 + 200) × 1.46 + 30 ≈ 1818 캘린더일 ≈ 5년
```

---

## 5. 백엔드 단계별 처리 연동 (TO-BE 구현 계획)

### 학습 요청 파라미터 변경

```json
{
  "group":     "sp500",
  "ticker":    "AAPL",
  "stage":     7,               // 추가: 1~11 (미지정 시 자동 결정)
  "modelName": "XGB_sp500_s7"
}
```

### 자동 단계 결정 로직

```python
def auto_select_stage(available_trading_days: int, min_rows: int = 200) -> int:
    """보유 거래일 수를 보고 가능한 최대 단계 자동 선택"""
    for stage in range(11, 0, -1):
        required = STAGES[stage - 1] + min_rows
        if available_trading_days >= required:
            return stage
    return 1  # 최소 1단계
```

### yfinance 요청량 자동 산출

```python
def fetch_for_training(ticker, stage):
    days_needed = required_calendar_days_for_training(stage)
    return fetch_stock_history_yf(ticker, days=days_needed)

def fetch_for_prediction(ticker, stage):
    # 예측은 lookback만 필요
    trading_days = STAGES[stage - 1] + 10  # 여유 +10
    calendar_days = int(trading_days * (365 / 250)) + 10
    return fetch_stock_history_yf(ticker, days=calendar_days)
```

---

## 6. 단계별 데이터 요구량 참고표

| 단계 | 최대 lookback | 학습 필요 거래일 | 학습 필요 캘린더년 | 예측 필요 캘린더년 |
|------|-------------|-----------------|------------------|--------------------|
| 1    | 1d           | ~201            | ~1년             | ~1개월 |
| 2    | 2d           | ~202            | ~1년             | ~1개월 |
| 3    | 4d           | ~204            | ~1년             | ~1개월 |
| 4    | 8d           | ~208            | ~1년             | ~1.5개월 |
| 5    | 16d          | ~216            | ~1년             | ~2.5개월 |
| 6    | 32d          | ~232            | ~1.1년           | ~2개월 |
| 7    | 64d          | ~264            | ~1.3년           | ~4개월 |
| 8    | 128d         | ~328            | ~1.5년           | ~7개월 |
| 9    | 256d         | ~456            | ~2.2년           | ~1.2년 |
| 10   | 512d         | ~712            | ~3.4년           | ~2.4년 |
| 11   | 1024d        | ~1224           | ~5.8년           | ~4.9년 |

---

## 7. 티커 데이터 가용성 처리

### 문제

yfinance에서 "max" 조회 시 종목마다 보유 이력이 다릅니다:

| 종목 유형 | 보유 이력 예시 | 학습 가능 최대 stage |
|----------|-------------|-------------------|
| S&P500 대형주 (AAPL 등) | 20~40년 | 11단계 가능 |
| 최근 상장 중형주 | 2~3년 | 8~9단계 |
| 신생 소형주 / 스팩 | 6개월~1년 | 1~5단계 |
| 워런트 / ETP | 1~2년 또는 없음 | 1~3단계 또는 불가 |

### 자동 처리 (TO-BE 구현)

```
사용자가 stage 11 선택
        ↓
백엔드: 해당 종목 max 데이터 취득 (yfinance)
        ↓
보유 캔들 수 확인
  ├─ 충분 (>1224 거래일)  → stage 11 그대로 학습
  └─ 부족 (예: 400 거래일) → get_max_achievable_stage(400) = stage 8로 자동 조정
        ↓
WebSocket으로 클라이언트에 조정 알림 전송:
  {"type": "notice", "message": "데이터 부족으로 stage 8로 자동 조정됐어요."}
```

### 그룹 학습 시 처리

그룹(sp500, usall 등) 학습에서는 종목마다 보유 이력이 다릅니다:

- 각 종목별로 `get_max_achievable_stage(len(candles))`를 계산
- 사용자가 선택한 stage와 일치하는 피처 수가 나온 종목만 학습 데이터에 포함
- 신생 종목은 자동으로 제외됨 (피처 개수 불일치)
- 결과적으로 "그룹 내 해당 stage에서 학습 가능한 종목들"만 학습됨

### 예측 시 처리

예측도 동일: 모델이 stage 11로 학습됐으나 티커 데이터가 부족하면:
- 예측 불가 메시지 반환: `"데이터 부족: NEWCO는 stage 11 예측에 필요한 데이터가 없습니다 (보유 300일)"`
- 앱에서 해당 에러 메시지를 표시

---

## 8. 레이블 (Y)

### AS-IS
```
다음날변동률% = (내일종가 − 오늘종가) / 오늘종가 × 100
Y = 1  if  다음날변동률% >= 2.0%
Y = 0  otherwise
```

### TO-BE
```
다음날변동률% = (내일종가 − 오늘종가) / 오늘종가 × 100
Y = 1  if  다음날변동률% > 0%    (상승이면 무조건 매수 신호)
Y = 0  if  다음날변동률% <= 0%   (보합 또는 하락)
```

> 소형주·대형주 구분 없이 동일한 기준 적용.  
> 2.0% 임계값은 대형주에서 신호가 너무 적게 나오는 문제가 있었음.
