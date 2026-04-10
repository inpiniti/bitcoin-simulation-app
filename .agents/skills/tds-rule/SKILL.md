---
name: tds-rule
description: 토스 앱에서 발견한 10가지 UX 법칙. UI 설계·코드 리뷰·컴포넌트 작성 시 이 법칙들을 준수했는지 확인하세요. 피츠의 법칙(터치 타깃), 힉의 법칙(선택지), 밀러의 법칙(청킹), 포스텔의 법칙(입력 최소화), 도허티 임계(로딩), 피크엔드, 테슬러, 심미적 사용성, 폰 레스토프, 제이콥 법칙 포함.
---

# 토스에서 찾아본 10가지 UX 법칙

> 출처: 채드윅, brunch.co.kr/@chadwick/33 (2022-09-28)  
> 원전: 존 야블론스키 ≪UX/UI의 10가지 심리학 법칙≫

이 스킬은 **UI 작성 전 체크리스트**, **코드 리뷰 기준**, **컴포넌트 설계 원칙**으로 활용해요.

---

## 1. 제이콥의 법칙 (Jakob's Law)

> 사용자는 본인이 다른 서비스에서 축적한 경험으로 새 프로덕트를 판단한다.

![제이콥의 법칙 — 토스 vs 뱅크샐러드 비교](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/k6CND4Wi_YIsQqWRWhe_08jCgXs.png)

### 핵심

- 기존 금융·증권 앱의 화면 구조(자산 목록 → 종목 카드 → 주문)를 따르세요.
- 완전히 새로운 인터랙션을 도입하면 사용자가 처음부터 학습해야 해요.
- 멘탈 모델을 깨야 할 이유가 없으면 **익숙한 패턴을 유지**하세요.

### React Native 체크리스트

- [ ] 잔고 화면은 "보유 종목 → 카드 형태" 구조를 유지했는가?
- [ ] 탭 순서가 다른 증권/투자 앱(계좌·관심·예약·모델)과 유사한가?
- [ ] 주문 플로우가 "종목 선택 → 수량 입력 → 확인"의 표준 순서인가?

---

## 2. 피츠의 법칙 (Fitts's Law)

> 목표물에 도달하는 시간은 거리와 크기에 비례한다.

### 핵심

- **터치 타깃 최소 크기: 44×44dp** (Apple HIG 기준)
- 버튼·칩·아이콘 간격: **최소 8dp** 이상
- 리스트는 세로(Vertical)로 나열해야 시선 흐름에 맞아요.
- 자주 쓰는 버튼(매수·매도)은 엄지가 닿기 쉬운 하단에 위치시키세요.

### React Native 체크리스트

- [ ] `Chip` / 선택지 버튼의 `paddingVertical` ≥ 11 (총 높이 ≥ 44dp)?
- [ ] `Button size="small"`의 실제 터치 영역이 44dp 이상인가?
- [ ] 매수/매도 버튼이 서로 너무 가깝지 않은가? (missclick 위험)
- [ ] 리스트 아이템 높이가 충분히 커서 스크롤 중 오터치가 없는가?

**코드 기준:**

```jsx
// ❌ 너무 작음
chip: { paddingVertical: 7, paddingHorizontal: 12 }  // 약 30dp

// ✅ 최소 기준
chip: { paddingVertical: 11, paddingHorizontal: 14 } // 약 44dp
```

---

## 3. 힉의 법칙 (Hick's Law)

> 선택지가 많아질수록 결정 시간과 인지 부하가 증가한다.

![힉의 법칙 — 그룹핑 예시](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/JZZrMgGzKag-WmnbTNIpj9xmgdA.png)

### 핵심

- 한 화면에 노출되는 선택지는 **7개 이하**로 제한하세요.
- 관련 옵션을 **그룹핑**해서 임계값이나 시장/기간 선택 등을 분리하세요.
- 단계적으로 펼치는(progressive disclosure) 방식으로 복잡도를 숨기세요.

### React Native 체크리스트

- [ ] 한 화면에 보이는 칩(Chip) 선택지가 7개를 넘지 않는가?
- [ ] 임계값 선택(0.5~0.8) 같은 비전문 사용자가 어렵게 느낄 수 있는 항목에  
      레이블/설명이 충분한가?
- [ ] 선택지들이 명확히 구분되어 한눈에 파악되는가?

---

## 4. 밀러의 법칙 (Miller's Law)

> 작업 기억에는 7(±2)개의 항목밖에 저장하지 못한다.

### 핵심

- 한 섹션의 목록 아이템은 **5~9개** 이내로 제한하거나,  
  넘으면 "더 보기"로 접도록 하세요.
- 숫자(금액·확률)는 **청킹(chunking)** 형식으로 표현하세요:  
  `₩74,330` (O) vs `74330` (X), `82%` (O) vs `0.82` (X)
- 관련 정보끼리 카드/섹션으로 묶어 하나의 덩어리처럼 인식되게 하세요.

### React Native 체크리스트

- [ ] 금액은 `₩1,234,567` 형식으로 표현하는가?
- [ ] 확률은 `82%`처럼 백분율로 표현하는가?
- [ ] 예측 결과 테이블이 한 번에 보이는 행이 5~7행 이내인가?
- [ ] 섹션 제목(레이블)이 각 카드 그룹을 명확히 구분하는가?

---

## 5. 포스텔의 법칙 (Postel's Law)

> 사용자 입력은 관대하게 수용하되, 요청하는 입력량은 보수적으로 줄여라.

![포스텔의 법칙 — 1 thing / 1 page](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/ZX8i7ivRhqVmvyYxElJ7HkCgg1Q.png)

### 핵심

- 토스의 **"1 thing / 1 page"** 철학: 하나의 화면에는 하나의 목적만 담으세요.
- 한 번에 너무 많은 입력 필드를 보여주면 피로도가 쌓여요.
- 사용자가 입력할 정보를 시스템이 추론할 수 있다면 자동으로 채워주세요.

### React Native 체크리스트

- [ ] BottomSheet 주문 화면에서 묻는 정보가 "수량" 하나뿐인가?
- [ ] 예약 설정 화면에서 한 번에 노출되는 필드가 5개를 넘지 않는가?
- [ ] 기본값이 사용자에게 합리적인 선택지인가(시장: KOSPI, 기간: 30일 등)?

---

## 6. 피크엔드의 법칙 (Peak-End Rule)

> 사용자는 경험 전체보다 절정과 마지막 순간의 감정으로 판단한다.

![피크엔드의 법칙 — 실패 화면 처리](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/GQ39y0PgrGB0LaqrfW2_vg7g8T8.png)

### 핵심

- **오류·실패·빈 화면**은 가장 기억에 남는 순간이에요.  
  冷정한 시스템 오류 메시지 대신 따뜻하고 친근한 문구를 사용하세요.
- 성공 순간(매수 완료, 예측 완료 등)에는 긍정적 피드백을 주세요.
- 빈 상태(empty state)에는 단순 텍스트 대신 **이모지·아이콘 + 설명**을 사용하세요.

### React Native 체크리스트

- [ ] 빈 잔고 화면에 아이콘/이모지 + "아직 보유한 종목이 없어요" 형태인가?
- [ ] API 실패 시 Alert 메시지가 해요체 + 긍정형인가?  
      `"연결할 수 없어요. 잠시 후 다시 시도해줘요."` (O) vs `"에러 발생"` (X)
- [ ] 주문 완료 후 간단한 성공 피드백이 있는가?
- [ ] 데이터 없는 로그 탭에 안내 메시지가 충분한가?

**코드 기준:**

```jsx
// ❌ 차가운 빈 상태
<Text>보유 종목이 없습니다</Text>

// ✅ 따뜻한 빈 상태
<View style={styles.emptyState}>
  <Text style={styles.emptyIcon}>📭</Text>
  <Text style={styles.emptyTitle}>아직 보유한 종목이 없어요</Text>
  <Text style={styles.emptyDesc}>관심 종목을 매수하면 여기에 나타나요</Text>
</View>
```

---

## 7. 테슬러의 법칙 (Tesler's Law)

> 모든 시스템에는 줄일 수 없는 일정 수준의 복잡성이 존재한다.  
> 그 복잡성은 사용자가 아닌 시스템이 흡수해야 한다.

![테슬러의 법칙 — 은행 자동 추천](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/CPfH1rMosJEKxc8fMJDIYMnXqjk.png)

### 핵심

- 사용자가 직접 해야 하는 복잡한 작업(임계값 입력, 파라미터 설정 등)을  
  시스템이 대신 추천·자동화해주세요.
- XGBoost 파라미터, 임계값 기본값 등은 사용자 대신 시스템이 최적값을 제안하세요.

### React Native 체크리스트

- [ ] 임계값(buy_threshold, sell_threshold)에 합리적인 기본값이 설정되어 있는가?
- [ ] 예측 결과에서 BUY/SELL/HOLD 신호를 사용자가 직접 해석하지 않아도 되는가?
- [ ] 자동매매 활성화 토글 상태가 맥락 없이 나타나지 않는가  
      (현재 설정 요약과 함께 표시)?

---

## 8. 심미적 사용성 효과 (Aesthetic-Usability Effect)

> 보기 좋은 디자인이 더 사용하기 편하다고 인식된다.

![심미적 사용성 효과 — 토스 디자인](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/d-VQGeaEclsjHX4C8t3FfUZPPbA.png)

### 핵심

- 배경 `#f7f9fc`, 카드 `#ffffff`, 텍스트 `#191f28`의 깔끔한 계층을 유지하세요.
- 그림자는 미묘하게(`shadowOpacity: 0.05~0.08`), 모서리는 둥글게(`borderRadius: 16~24`).
- 컬러 포인트는 `#3182f6` 하나로 일관성을 유지하세요.
- 아이콘, 배지, 수익률 색상이 일관된 시스템을 따르는지 검토하세요.

### React Native 체크리스트

- [ ] 카드 컴포넌트의 그림자와 모서리 반경이 일관적인가?
- [ ] 수익/손실 컬러가 `#f04452`(빨강/수익) / `#03b26c`(초록/손실)로 통일되었는가?
- [ ] 기본 강조 컬러가 `tdsColors.blue500 = #3182f6` 하나로 통일되었는가?
- [ ] 텍스트 계층(primary/secondary/tertiary)이 화면 전반에서 일관적인가?

---

## 9. 폰 레스토프 효과 (Von Restorff Effect)

> 비슷한 것들 중에서 가장 색다른 것만 기억에 남는다.

### 핵심

- 가장 중요한 CTA(예: 예측하기, 매수하기)는 다른 요소와 **시각적으로 차별화**하세요.
- 신호 배지(BUY/SELL/HOLD)는 색상으로 명확히 구분되어야 해요.
- **남용 금지**: 모든 것을 강조하면 아무것도 강조되지 않아요.

### React Native 체크리스트

- [ ] BUY 신호가 빨간 배지로, SELL이 초록 배지로, HOLD가 주황 배지로 구분되는가?
- [ ] 주요 CTA 버튼이 `variant="fill"` + `color="primary"`로 다른 버튼과 차별화되는가?
- [ ] 강조 색상(빨강·초록·주황 배지)이 3가지 이상 한 화면에 동시에 남발되지 않는가?
- [ ] "실행 중" 상태의 자동매매 토글이 시각적으로 명확하게 강조되는가?

---

## 10. 도허티 임계 (Doherty Threshold)

> 사용자의 몰입을 유지하려면 0.4초 이내에 피드백을 제공해야 한다.

![도허티 임계 — 로딩 애니메이션](https://img1.daumcdn.net/thumb/R1280x0.fpng/?fname=http://t1.daumcdn.net/brunch/service/user/ctC5/image/k3gNWKmXc6lRCg84ZV7WN--JWEo.png)

### 핵심

- 데이터 로딩 중에는 **스켈레톤 UI** 또는 플레이스홀더로 레이아웃 자리를 잡아주세요.
- 전체 화면 `ActivityIndicator`만 사용하면 사용자가 흰 화면을 보게 돼요.
- 예측/학습처럼 긴 작업에는 단계별 **진행률 표시**가 필수예요.
- 버튼 클릭 후 즉각적인 시각 피드백(로딩 스피너 인라인)이 필요해요.

### React Native 체크리스트

- [ ] 리스트 데이터 로딩 시 스켈레톤 플레이스홀더가 표시되는가?
- [ ] 버튼의 `loading` prop이 클릭 즉시 반응하는가?
- [ ] 예측/학습 진행 시 단계별 진행률이 표시되는가?
- [ ] Pull-to-refresh의 `RefreshControl` 색상이 브랜드 색상(`#3182f6`)인가?

**코드 기준:**

```jsx
// ❌ 빈 화면 + ActivityIndicator만
{
  loading && <ActivityIndicator />;
}

// ✅ 스켈레톤으로 레이아웃 유지
{
  loading
    ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
    : items.map((item) => <ItemRow key={item.id} item={item} />);
}
```

---

## 빠른 체크리스트 요약

| #   | 법칙         | 핵심 규칙              | 코드 기준               |
| --- | ------------ | ---------------------- | ----------------------- |
| 1   | 제이콥       | 익숙한 패턴 유지       | 표준 증권 UI 구조       |
| 2   | **피츠**     | 터치 타깃 ≥ 44dp       | `paddingVertical ≥ 11`  |
| 3   | **힉**       | 선택지 ≤ 7개           | 칩 7개 이하             |
| 4   | 밀러         | 청킹으로 정보 묶기     | `₩74,330`, `82%`        |
| 5   | 포스텔       | 1 thing / 1 page       | BottomSheet: 수량만     |
| 6   | **피크엔드** | 빈 상태도 따뜻하게     | 이모지 + 해요체 안내    |
| 7   | 테슬러       | 복잡성은 시스템이 흡수 | 합리적 기본값 제공      |
| 8   | 심미적       | 깔끔하고 일관된 디자인 | 그림자·컬러 시스템 통일 |
| 9   | 폰 레스토프  | 중요한 것 하나만 강조  | BUY=빨강, CTA=파랑 only |
| 10  | **도허티**   | 로딩 중 레이아웃 유지  | SkeletonRow 사용        |

> **굵게 표시된 법칙**은 React Native 앱에서 특히 자주 위반되는 항목이에요.
