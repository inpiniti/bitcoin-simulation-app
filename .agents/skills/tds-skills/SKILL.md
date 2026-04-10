---
name: tds-skills
description: TDS Mobile (Toss Design System) 컴포넌트 레퍼런스. 설치, 컬러/타이포그래피 토큰, Badge·Button·BottomSheet·Dialog·TextField 등 전체 컴포넌트 API와 OverlayExtension 훅을 포함. TDS Mobile 컴포넌트 사용·구현 시 참조.
---

# TDS Mobile — Toss Design System

토스 제품을 만들 때 공통으로 사용하는 디자인 시스템이에요. 수백 개의 컴포넌트와 템플릿으로 구성되어 있으며 개발과 직접 연결돼요.

**목표**
- 제품의 최소 품질을 언제나 보장 (일관된 UI 유지)
- 재사용 가능한 디자인으로 UI 개발 효율화
- 일관성 있는 인터랙션·애니메이션·디자인 템플릿으로 완성도 최고 수준 달성

---

## 시작하기

### 1. 필수 패키지 설치

```sh
npm install @toss/tds-mobile @toss/tds-mobile-ait @emotion/react@^11 react@^18 react-dom@^18
```

### 2. Provider 설정

```jsx
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';

function App({ Component, pageProps }) {
  return (
    <TDSMobileAITProvider>
      <Component {...pageProps} />
    </TDSMobileAITProvider>
  );
}
```

### 3. 컴포넌트 사용

```js
import { Button } from '@toss/tds-mobile';

const App = () => <Button>버튼</Button>;
```

---

## Foundation

### Colors

```bash
yarn add @toss/tds-colors
```

```jsx
import { colors } from '@toss/tds-colors';
<div style={{ backgroundColor: colors.blue500 }} />
```

**색상 패밀리** (각 10단계, 50–900):
- Grey, Blue, Red, Orange, Yellow, Green, Teal, Purple
- Grey Opacity (반투명 오버레이, 0.02–0.91)

패턴: `colors.[colorName][intensity]` (예: `colors.blue500`, `colors.greyOpacity100`)

### Typography

토큰 계층: Typography 1–7 및 서브 변형 (st1–st13)

| 토큰 | 폰트 크기 | 줄 높이 |
|------|---------|--------|
| Typography 1 | 30px | 40px |
| sub Typography 13 | 11px | 16.5px |

**폰트 웨이트**: Light, Regular, Medium, Semibold, Bold

**접근성 (Larger Text)**
- iOS: Large → xxxLarge (100%–310% 스케일링)
- Android: `base × NN × 0.01` 수식, 토큰별 최대값 캡 적용
- 값을 하드코딩하지 말 것 — 접근성 설정에 따라 동적 조정됨

---

## Components

### Agreement (AgreementV4)

동의 화면 구성 컴포넌트. 다수의 동의 항목을 접이식으로 구성 가능.

**하위 컴포넌트**

| 컴포넌트 | 설명 |
|---------|------|
| `AgreementV4.Text` | 설명/제목 텍스트, `onPressEnd` 감지 |
| `AgreementV4.Badge` | `fill`/`clear` 뱃지 |
| `AgreementV4.Checkbox` | `checkbox`/`dot`/`hidden` 변형 |
| `AgreementV4.Necessity` | `mandatory`(파란색)/`optional`(회색) |
| `AgreementV4.RightArrow` | `collapsed`로 접기/펼치기 |
| `AgreementV4.Description` | `box`/`normal` 보조 설명 |
| `AgreementV4.Header` | 섹션 제목 |
| `AgreementV4.IndentPushable` | 중첩 동의 항목 들여쓰기 |
| `AgreementV4.Collapsible` | `collapsed`, `onCollapsedChange` |
| `AgreementV4.Group` | `showGradient` 옵션 포함 그룹 |

**레이아웃**: left(체크박스) / middle(텍스트) / right(화살표 등)

**variant**: `xLarge`, `large`, `medium`, `medium-title`, `small`, `small-last`

---

### Asset

아이콘·이미지·비디오·Lottie·텍스트를 일관된 방식으로 표시.

**구조**
- **Frame**: 크기·형태·배경 일관성 제공 (핵심)
- **Content**: 실제 표시 영역 (`scaleType`: fit/crop)
- **Union**: `overlap`(스택 표시), `acc`(액세서리 상태)

**Frame Shape 프리셋**: Square(S/M/L), Rectangle(M/L), Circle(S/M/L), Card(S/M/L)

**Acc 위치**: top-left, bottom-left, top-right(기본), bottom-right

**래핑 컴포넌트 (Frame + Content 조합)**

| 컴포넌트 | 내용 |
|---------|------|
| `Asset.Icon` | 아이콘, `color` 지원 |
| `Asset.Image` | 이미지, `scaleType`: fit/crop |
| `Asset.Lottie` | Lottie 애니메이션 |
| `Asset.Text` | 텍스트 |
| `Asset.Video` | `autoPlay`, `loop`, `muted`, `controls`, `playsInline` |

`frameShape` 프리셋 예: `Asset.frameShape.SquareMedium`

---

### Badge

아이템 상태를 강조하여 빠른 인식을 돕는 컴포넌트.

| Prop | 타입 | 비고 |
|------|------|------|
| `variant` * | `"fill"` \| `"weak"` | fill: 채도 높음, weak: 채도 낮음 |
| `size` * | `"xsmall"` \| `"small"` \| `"medium"` \| `"large"` | — |
| `color` * | `"blue"` \| `"teal"` \| `"green"` \| `"red"` \| `"yellow"` \| `"elephant"` | — |

---

### BoardRow

아코디언 형태로 제목 클릭 시 콘텐츠를 펼치고 접는 컴포넌트. Q&A 형식에 적합.

**Props**

| Prop | 설명 |
|------|------|
| `title` * | 클릭 가능한 제목 |
| `initialOpened` | 기본 펼침 여부 |
| `isOpened` + `onOpen`/`onClose` | 외부 상태 제어 |
| `prefix`, `icon` | 제목 앞 요소 |

**하위**: `BoardRow.Text` (Post.Paragraph 확장), `BoardRow.Prefix`, `BoardRow.Icon`

**접근성**: `<button>`, `aria-expanded` 자동 적용

---

### Border

목록/섹션의 시각적 구분선.

| variant | 설명 |
|---------|------|
| `"full"` (기본) | 전체 너비 구분선 |
| `"padding24"` | 양쪽 24px 여백 후 구분선 |
| `"height16"` | 섹션 간격 공간 |

`height` prop: `variant="height16"` 일 때 높이 커스터마이즈

---

### BottomInfo

화면 하단 법적 고지/디스클레이머 표시. Post 컴포넌트와 함께 사용.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `bottomGradient` | `linear-gradient(adaptive.greyBackground, rgba(255,255,255,0))` | 하단 그라데이션 |

`bottomGradient="none"` 가능 (iOS 호환성 문제로 비권장)

---

### BottomCTA

하단 고정 CTA 버튼. `FixedBottomCTA`는 `fixed=true`가 기본으로 설정된 버전.

#### BottomCTA.Single (단일 버튼)

| Prop | 기본값 | 설명 |
|------|--------|------|
| `children` * | — | 버튼 내용 |
| `hasSafeAreaPadding` | `true` | SafeArea 패딩 (`--toss-safe-area-bottom`) |
| `hasPaddingBottom` | `true` | 하단 패딩 |
| `fixed` | — | 화면 하단 고정 |
| `background` | `'default'` | `"none"` 으로 배경 제거 |
| `fixedAboveKeyboard` | — | 키보드 위에 고정 |
| `showAfterDelay` | — | 지연 후 등장 (`fade`/`scale`/`slide`) |
| `hideOnScroll` | — | 스크롤 시 숨김 |

#### BottomCTA.Double (이중 버튼)

| Prop | 기본값 | 설명 |
|------|--------|------|
| `leftButton` * | — | 왼쪽 버튼 |
| `rightButton` * | — | 오른쪽 버튼 |
| `hideOnScroll` | — | 스크롤 시 숨김 |
| `hideOnScrollDistanceThreshold` | `1px` | 숨김 트리거 거리 |

`FixedBottomCTA.Double`로 이중 버튼 고정 CTA 사용.

---

### BottomSheet

화면 하단에서 슬라이드업 되는 패널.

| Prop | 타입 | 설명 |
|------|------|------|
| `open` * | boolean | 표시 여부 |
| `onClose` | function | 닫기 콜백 |
| `maxHeight` | — | 최대 높이 |
| `expandedMaxHeight` | — | 확장 시 최대 높이 |
| `expandBottomSheet` | — | 드래그로 전체화면 확장 |
| `expandBottomSheetWhenScroll` | — | 스크롤로 전체화면 확장 |
| `UNSAFE_disableFocusLock` | — | 포커스 잠금 비활성화 |
| `disableDimmer` | — | 어두운 오버레이 제거 |

**하위**: `BottomSheet.Header`, `BottomSheet.HeaderDescription`, `BottomSheet.CTA`, `BottomSheet.DoubleCTA`, `BottomSheet.Select`

---

### Bubble

채팅 메시지 말풍선. 파란색(사용자) / 회색(상대방).

| Prop | 기본값 | 타입 |
|------|--------|------|
| `background` * | — | `"blue"` \| `"grey"` |
| `withTail` | `true` | boolean |
| `children` | — | ReactNode |

파란색: 말풍선 꼬리 오른쪽, 회색: 왼쪽

---

### Button

| 구분 | 옵션 |
|------|------|
| size | `small`, `medium`, `large`, `xlarge` |
| variant | `fill`(강조), `weak`(보조) |
| display | `inline`, `block`, `full` |
| 상태 | `loading`, `disabled` |

**접근성**: `aria-busy`(로딩), `aria-label`(아이콘 전용), `as` prop으로 `button`/`a` 전환

---

### Chart.BarChart

막대 차트 컴포넌트.

**데이터 구조**

| 필드 | 설명 |
|------|------|
| `maxValue` | 차트 전체 최대값 |
| `value` * | 막대 실제 값 |
| `label` | X축 텍스트 |
| `barAnnotation` | 막대 위 텍스트 |
| `theme` | `blue`/`green`/`yellow`/`orange`/`red`/`grey`/`"default"` |

**fill.type**: `all-bar`(전체 동일 색), `single-bar`(특정 막대 강조), `auto`(우→좌 순서대로 색 적용)

`height` 기본: 205px. 데이터 12개 초과 시 첫·마지막 항목만 라벨 표시.

---

### Checkbox

단일/다중 선택 체크박스.

**변형**: `Checkbox.Circle`(원 테두리 안 체크), `Checkbox.Line`(체크 아이콘만)

| Prop | 기본값 | 타입 |
|------|--------|------|
| `inputType` | `'checkbox'` | `"checkbox"` \| `"radio"` |
| `size` | `24` | number |
| `checked` | — | boolean |
| `onCheckedChange` | — | `(checked: boolean) => void` |
| `defaultChecked` | — | boolean |
| `disabled` | — | boolean |

**접근성**: `aria-label` 필수 (체크박스/라디오 용도 명시). 라벨에 "체크박스" 포함 불필요.

---

### Dialog

사용자에게 중요한 정보 전달 또는 선택을 요구하는 모달.

| 타입 | 버튼 수 | 용도 |
|------|---------|------|
| `AlertDialog` | 단일 (`AlertDialog.AlertButton`) | 작업 완료·상태 변경 알림 |
| `ConfirmDialog` | 두 개 (`CancelButton` + `ConfirmButton`) | 중요 액션 확인 |

**AlertDialog Props**

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` * | — | 표시 여부 |
| `onClose` * | — | 반드시 제공 필요 |
| `closeOnDimmerClick` | `true` | false: 위글 애니메이션 |
| `closeOnBackEvent` | `true` | — |
| `portalContainer` | `document.body` | z-index 이슈 해결 시 커스텀 |

**ConfirmDialog** 동일 구조 + 취소 버튼 추가.

---

### GridList

그리드 레이아웃으로 아이템(이미지+텍스트) 배열.

| `column` 값 | 설명 |
|------------|------|
| `1` | 긴 콘텐츠 강조 |
| `2` | 더 큰 사이즈·가독성 |
| `3` (기본) | 많은 아이템 효율 표시 |

**GridListItem Props**: `image` *(필수)*, `children`(Paragraph로 렌더링)

---

### Highlight

특정 영역을 강조, 나머지 화면을 어둡게 처리.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` * | — | 표시 여부 |
| `padding` | `0` | 강조 영역 내부 여백(px) |
| `delay` | `0` | 표시 지연(초) |
| `message` | — | 설명 텍스트 또는 커스텀 요소 |
| `messageColor` | `colors.white` | 텍스트 색상 |
| `onClick` | — | 강조 영역 외부 클릭 핸들러 |
| `onExited` | — | 애니메이션 완료 콜백 |

---

### IconButton

아이콘 기반 액션 버튼.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `aria-label` * | — | 필수 (아이콘만으론 역할 불명) |
| `variant` | `'clear'` | `"fill"` \| `"clear"` \| `"border"` |
| `src` or `name` | — | 동시 사용 불가 |
| `color` | — | mono 타입 아이콘 색상 |
| `bgColor` | `adaptive.greyOpacity100` | 배경색 |
| `iconSize` | `24` | px 단위 |

---

### Keypad

#### AlphabetKeypad

A–Z 알파벳 키패드. 인증코드·문자 입력.

| Prop | 설명 |
|------|------|
| `onKeyClick` * | 키 클릭 시 실행, 클릭된 문자 파라미터 |
| `onBackspaceClick` * | 백스페이스 클릭 시 실행 |
| `alphabets` | 커스텀 문자 배열 (기본: A–Z 대문자) |

#### FullSecureKeypad

숫자+알파벳 보안 키패드. 키 사이 랜덤 공백 배치.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `onKeyClick` * | — | 숫자/알파벳 키 클릭 |
| `onBackspaceClick` * | — | 백스페이스 클릭 |
| `onSpaceClick` * | — | 공백 키 클릭 |
| `onSubmit` * | — | 입력 완료 버튼 클릭 |
| `submitDisabled` | `false` | 완료 버튼 비활성화 |
| `submitButtonText` | `'입력 완료'` | 완료 버튼 텍스트 |

`ref.current.reorderEmptyCells()`: 공백 위치 무작위 재배치 (보안 강화)

#### NumberKeypad

숫자 키패드. 비밀번호 입력.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `onKeyClick` * | — | 숫자 클릭 |
| `onBackspaceClick` * | — | 백스페이스 클릭 |
| `numbers` | 0–9 순서 | 커스텀 숫자 배열 |
| `secure` | `false` | 보안 모드 (주민번호 뒷자리 등에 필수) |

보안 모드: 랜덤 숫자 함께 처리, Android 스크린샷 방지, 앱 전환 시 화면 가림.

---

### ListFooter

목록 하단 "더 보기" 요소.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `border` | `'full'` | `"full"` \| `"indented"` \| `"none"` |
| `icon` | — | string 또는 ReactElement |
| `textColor` | `adaptive.blue500` | — |
| `iconColor` | `adaptive.blue500` | — |
| `aria-label` | 필수 | 스크린리더 사용자를 위한 버튼 용도 명시 |

---

### ListHeader

목록 헤더. 제목+설명+우측 요소 조합.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `title` * | — | TitleParagraph / TitleSelector / TitleTextButton |
| `descriptionPosition` | `'top'` | `"top"` \| `"bottom"` |
| `titleWidthRatio` | `0.66` | 제목 영역 비율 (텍스트 스케일 200% 초과 시 0.5 캡) |
| `right` | — | RightText / RightArrow |
| `rightAlignment` | `'center'` | `"bottom"` \| `"center"` |

---

### ListRow

left / contents / right 3영역 구성 목록 컴포넌트.

**Border**: `indented`(왼쪽 들여쓰기), `none`(연결 외관)

**수직 패딩**: `small`(8), `medium`(12), `large`(16), `xlarge`(24px)

**수평 패딩**: `small`(20), `medium`(24px)

**Disabled 스타일**: `type1`(연한 배경), `type2`(더 진한 배경)

**시각 효과**: 터치 피드백, 화살표, 반짝임 애니메이션, 깜빡임

**영역 구성 컴포넌트**

| 컴포넌트 | 주요 Shape 옵션 |
|---------|----------------|
| `ListRow.AssetIcon` | original / squircle / card / circle |
| `ListRow.AssetImage` | original / squircle / card / square / circle |
| `ListRow.AssetLottie` | AssetImage와 동일 |
| `ListRow.AssetText` | squircle / card |
| `ListRow.IconButton` | fill / clear / border |
| `ListRow.Texts` | 1Row/2Row/3Row × TypeA~F 조합 |

**Texts 네이밍**: `앞숫자`(줄 수) + `Right`(우측 정렬, 선택) + `타입`(A~F)

`ListRow.Loader`: 로딩 스켈레톤 UI (`square`/`circle`/`bar` shape)

---

### Loader

로딩 중 시각적 피드백.

| Prop | 기본값 | 타입 |
|------|--------|------|
| `size` | `'medium'` | `"small"` \| `"medium"` \| `"large"` |
| `type` | `'primary'` | `"primary"` \| `"dark"` \| `"light"` |
| `label` | — | string (로더 아래 텍스트) |

`type="light"`: 어두운 배경에 권장

---

### Menu

드롭다운 메뉴. 설정 화면·작업 목록.

**주요 컴포넌트**

| 컴포넌트 | 설명 |
|---------|------|
| `Menu.Dropdown` | 드롭다운 컨테이너 (헤더 옵션) |
| `Menu.Header` | 메뉴 상단 제목 |
| `Menu.DropdownItem` | 개별 선택 옵션 |
| `Menu.DropdownIcon` | 아이콘 추가 (`right` prop) |
| `Menu.DropdownCheckItem` | 체크 가능 항목 (`checked`, `onCheckedChange`) |
| `Menu.Trigger` | 메뉴 열기/닫기 트리거 |

**placement**: 12가지 방향×정렬 조합 (top/bottom/left/right × start/center/end)

---

### Modal

중요 콘텐츠를 다른 화면 위에 표시. 사용자 확인/액션 필요.

**구성**: `Modal.Overlay`(배경) + `Modal.Content`(내용)

**Modal Props**

| Prop | 설명 |
|------|------|
| `open` | 표시 여부 |
| `onOpenChange` | 상태 변경 콜백 |
| `onExited` | 완전 닫힘·애니메이션 완료 후 콜백 |
| `portalContainer` | 기본 `document.body` |

**Modal.Overlay Props**: `onClick` (배경 클릭 이벤트)

**접근성**: `aria-hidden`(외부 숨김), `tabIndex={0}`(포커스 이동), `role="button"`(오버레이)

---

### NumericSpinner

증가/감소 버튼으로 정수 입력.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `size` * | — | `"tiny"` \| `"small"` \| `"medium"` \| `"large"` |
| `number` | — | 현재 값 (외부 제어) |
| `defaultNumber` | — | 초기값 (내부 제어) |
| `minNumber` | `0` | 최솟값 |
| `maxNumber` | `999` | 최댓값 |
| `disable` | — | 비활성화 |
| `onNumberChange` | — | 값 변경 콜백 |
| `decreaseAriaLabel` | — | 감소 버튼 aria |
| `increaseAriaLabel` | — | 증가 버튼 aria |

**접근성**: `aria-live="polite"` 자동 적용 (수치 변경 읽어줌)

---

### Paragraph

텍스트 + 아이콘·뱃지·링크 조합 표시.

**주요 Props**

| Prop | 설명 |
|------|------|
| `typography` * | `"t1"~"t7"`, `"st1"~"st13"` |
| `display` | `"block"`(기본) \| `"inline"` |
| `fontWeight` | `regular` / `medium` / `semibold` / `bold` |
| `color` | CSS 색상값 또는 색상명 |
| `ellipsisAfterLines` | 줄 수 초과 시 말줄임 |

**하위 컴포넌트**
- `Paragraph.Text`: 텍스트
- `Paragraph.Icon`: 아이콘
- `Paragraph.Badge`: 뱃지 (`color`, `variant`)
- `Paragraph.Link`: `type="underline"` \| `"none"` (기본 색 blue500)

---

### Post

공지사항·이벤트 페이지용 본문 포맷 스타일.

| 컴포넌트 | 기본 타이포 | 설명 |
|---------|-----------|------|
| `Post.H1` | `t2` | 가장 큰 제목 |
| `Post.H2` | `t3` | 큰 제목 |
| `Post.H3` | `st8` | 표준 제목 |
| `Post.H4` | `t5` | 작은 제목 |
| `Post.Paragraph` | — | 본문 |
| `Post.Ol` | — | 순서 있는 목록 |
| `Post.Ul` | — | 순서 없는 목록 |
| `Post.Li` | — | 목록 항목 |
| `Post.Hr` | — | 구분선 |

모든 컴포넌트: `typography`(`t1–t7`, `st1–st13`), `paddingBottom`(px) 지원

---

### ProgressBar

진행 상태 시각화.

| Prop | 기본값 | 타입 |
|------|--------|------|
| `progress` * | — | number (0.0–1.0) |
| `size` | `'normal'` | `"light"` \| `"normal"` \| `"bold"` |
| `color` | `colors.blue400` | string |
| `animate` | `false` | boolean (값 변경 시 부드러운 전환) |

---

### ProgressStepper

진행바 + 단계 표시 조합.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `variant` * | — | `"compact"` \| `"icon"` |
| `paddingTop` | `"default"` | `"default"`(16px) \| `"wide"`(24px) |
| `activeStepIndex` | `0` | 현재 단계 인덱스 |
| `checkForFinish` | `false` | 완료 단계에 체크 아이콘 (icon variant만) |

**ProgressStep**: `title`(단계명), `icon`(커스텀 React 노드, icon variant만)

---

### Rating

별점 선택/표시 컴포넌트.

**인터랙티브 모드** (`readOnly={false}`)

| Prop | 설명 |
|------|------|
| `size` | `medium` \| `large` \| `big` |
| `onValueChange` | 별점 변경 콜백 |
| `disabled` | 비활성화 |

**읽기 전용** (`readOnly={true}`)

| Prop | 설명 |
|------|------|
| `size` | `tiny` \| `small` \| `medium` \| `large` \| `big` |
| `variant` | `full` \| `compact` \| `iconOnly` |

**접근성**: `aria-label`, `aria-valuetext`, `aria-hidden`, `<input type="range" />(숨김)`

---

### Result

작업 결과 표시. 성공·오류 상태 알림.

| Prop | 설명 |
|------|------|
| `figure` | 제목 위 시각 요소 (Asset 컴포넌트 활용) |
| `title` | 주요 상태 메시지 |
| `description` | 보조 설명 |
| `button` | `Result.Button` (재시도·홈 이동 등) |

**접근성**: `<h5>` 자동 적용, 장식 이미지 `alt=""` 자동 처리

---

### SearchField

검색 입력 필드.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `fixed` | `false` | 화면 상단 고정 |
| `takeSpace` | `true` | 고정 시 레이아웃 공간 유지 |
| `onDeleteClick` | — | 삭제 버튼 클릭 콜백 |

---

### SegmentedControl

라디오 버튼 형태의 단일 선택 컴포넌트.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `size` | `'small'` | `"small"` \| `"large"` |
| `alignment` | `'fixed'` | `"fluid"` 설정 시 수평 스크롤 가능 |
| `value` | — | 외부 선택 상태 |
| `defaultValue` | — | 내부 초기 상태 |
| `onChange` | — | 변경 콜백 |

**접근성**: `role="radiogroup"`, `role="radio"`, `aria-checked` 자동 업데이트

---

### Skeleton

로딩 중 레이아웃 구조 표시.

**프리셋 패턴** (9가지): `topList`, `topListWithIcon`, `amountTopList`, `amountTopListWithIcon`, `subtitleList`, `subtitleListWithIcon`, `listOnly`, `listWithIconOnly`, `cardOnly`

**커스텀**: `title`, `subtitle`, `list`, `listWithIcon`, `card`, `spacer(${number})` 조합

| Prop | 기본값 | 설명 |
|------|--------|------|
| `pattern` | `'topList'` | 9가지 프리셋 중 선택 |
| `custom` | — | 커스텀 배열 |
| `repeatLastItemCount` | `3` | 마지막 요소 반복 횟수 (최대 30) \| `"infinite"` |
| `background` | `'grey'` | `"white"` \| `"grey"` \| `"greyOpacity100"` |
| `play` | `'show'` | `"show"` \| `"hide"` |

---

### Slider

드래그로 숫자 값 선택.

| Prop | 설명 |
|------|------|
| `value` / `defaultValue` | 현재/초기 값 |
| `onValueChange` | 값 변경 콜백 |
| `minValue` / `maxValue` | 범위 제한 |
| `color` | 기본 `blue400` |
| `label` | 최솟값·최댓값·중간값 표시 |
| `tooltip` | `Slider.Tooltip` (실시간 값 표시) |

`Slider.Tooltip`: `message`, `offset` 지원

---

### Stepper

순차적 단계 시각화.

**텍스트 스타일**: Type A(기본), Type B(큰 제목), Type C(작은 설명)

**Left 요소**: 숫자 아이콘, 커스텀 에셋, 이미지

**Right 요소**: `RightArrow`, `RightButton`

**`hideLine`**: 마지막 단계에서 연결선 숨김

**애니메이션 Props** (Stepper 래퍼)

| Prop | 설명 |
|------|------|
| `staggerDelay` | 단계별 등장 간격(초) |
| `play` | 애니메이션 활성화 여부 |
| `delay` | 시작 지연(초) |

---

### Switch

토글 스위치 (on/off).

| Prop | 기본값 | 설명 |
|------|--------|------|
| `checked` | — | on/off 상태 |
| `disabled` | `false` | 비활성화 |
| `hasTouchEffect` | `true` | 클릭 애니메이션 |
| `onChange` | — | `(event, checked) => void` |

**접근성**: `role="switch"`, `aria-checked` 자동 업데이트, `aria-disabled`

```jsx
<Switch checked={isDarkMode} onChange={toggleDarkMode} aria-label="다크 모드" />
```

---

### Tab

단일 화면 내 복수 콘텐츠 전환.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `size` | — | `"small"` \| `"large"` |
| `fluid` | — | 수평 스크롤 활성화 |
| `itemGap` | — | 탭 항목 간격(px) |
| `onChange` | — | 선택 변경 콜백 |

`Tab.Item`: `selected`, `redBean`(빨간 원 알림 표시)

**접근성**: `role="tablist"`, `role="tab"`, `aria-selected` 자동 업데이트

---

### TableRow

수평 제목-내용 쌍 데이터 표시.

| Prop | 기본값 | 타입 |
|------|--------|------|
| `left` * | — | ReactNode |
| `right` * | — | ReactNode |
| `align` * | — | `"left"` \| `"space-between"` |
| `leftRatio` | — | number (align="left" 시 왼쪽 너비 %) |

---

### TextButton

텍스트 기반 액션 버튼.

| Prop | 기본값 | 타입 |
|------|--------|------|
| `size` * | — | `"xsmall"` \| `"small"` \| `"medium"` \| `"large"` \| `"xlarge"` \| `"xxlarge"` |
| `variant` | `'clear'` | `"arrow"` \| `"underline"` \| `"clear"` |
| `disabled` | `false` | boolean |

ParagraphText 확장 — ParagraphText Props 모두 상속

---

### TextField

기본 텍스트 입력 필드.

**variant**: `box`(기본 사각형), `line`(밑줄만), `big`(큰 텍스트), `hero`(주목형 큰 스타일)

**Label 표시**: `sustain`(항상), `appear`(값 입력 시만)

| Prop | 설명 |
|------|------|
| `label` / `placeholder` | 입력 안내 |
| `help` | 보조 메시지 |
| `hasError` | 에러 상태 |
| `disabled` | 비활성화 |
| `prefix` / `suffix` | 접두/접미 (예: 통화 기호, 단위) |
| `right` | 우측 버튼/아이콘 |

**확장 컴포넌트**
- `TextField.Clearable`: 지우기 버튼 (`onClear`)
- `TextField.Password`: 비밀번호 마스킹 (`onVisibilityChange`)
- `TextField.Button`: 값 선택·액션 트리거용 클릭 가능 필드

#### SplitTextField

고정 형식 분리 입력.

| 컴포넌트 | 설명 |
|---------|------|
| `SplitTextField.RRN13` | 주민번호 13자리 (6자리 + 7자리) |
| `SplitTextField.RRNFirst7` | 주민번호 앞 7자리 |

6자리 입력 완료 시 자동 포커스 이동.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `mask` (RRN13) | `true` | 뒷자리 마스킹 |
| `mask` (RRNFirst7) | `false` | — |

#### TextArea

여러 줄 텍스트 입력. TextField 확장 (`prefix`, `suffix`, `right` 제외).

| Prop | 설명 |
|------|------|
| `height` | 고정 높이 (string \| number) |
| `minHeight` | 자동 조절 시 최소 높이 |

---

### Toast

짧은 알림 메시지. 상단 또는 하단 표시 후 자동 닫힘.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` * | — | 표시 여부 |
| `position` | — | `"top"` \| `"bottom"` |
| `text` | — | 메시지 텍스트 |
| `duration` | `3000` | 자동 닫힘 시간(ms). 버튼 있을 시 5000 |
| `onClose` | — | 닫기 시작 시 콜백 |
| `leftAddon` | — | `Toast.Icon` \| `Toast.Lottie` |
| `button` | — | 액션 버튼 (하단 위치만) |
| `higherThanCTA` | — | 고정 하단 CTA 위에 표시 |
| `onExited` | — | 닫힘 애니메이션 완료 콜백 |

**접근성**: `aria-live="assertive"`(즉각 알림) \| `"polite"`(현재 읽기 완료 후 알림)

---

### Tooltip

보조 정보 표시 말풍선.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `open` | — | 외부 제어 |
| `defaultOpen` | — | 내부 초기 상태 |
| `size` | `'medium'` | `"small"` \| `"medium"` \| `"large"` |
| `placement` | — | `"top"` \| `"bottom"` |
| `autoFlip` | — | 공간 부족 시 방향 자동 전환 |
| `offset` | — | 트리거와의 거리 |
| `messageAlign` | — | 텍스트 정렬 |
| `clipToEnd` | — | `"none"` \| `"left"` \| `"right"` |
| `anchorPositionByRatio` | `0.5` | 화살표 위치 (0–1, 0.5=중앙) |
| `motionVariant` | — | `"weak"` \| `"strong"` |
| `strategy` | — | `"absolute"` \| `"fixed"` |

---

### Top

페이지 헤더 컴포넌트. 제목·부제목·버튼·에셋 등 다양한 레이아웃 지원.

| Prop | 기본값 | 설명 |
|------|--------|------|
| `title` * | — | 제목 |
| `upperGap` | `24` | 상단 여백(px) |
| `lowerGap` | `24` | 하단 여백(px) |
| `upper` | — | 에셋 등 상단 요소 |
| `lower` | — | 버튼·CTA 등 하단 요소 |
| `subtitleTop` / `subtitleBottom` | — | 제목 위/아래 부제목 |
| `right` | — | 우측 에셋·버튼 |

**하위**: `Top.TitleSelector`, `Top.SubtitleBadges`, `Top.LowerCTA`, `Top.RightButton`

**접근성**: `role="heading"`, `aria-level`, `aria-haspopup="listbox"` 자동 적용

---

## Hooks — OverlayExtension

| 훅 | 용도 |
|----|------|
| `useDialog` | 중요 정보 전달·결정 요구 |
| `useToast` | 일시적 알림·피드백 |
| `useBottomSheet` | 추가 정보·복잡한 상호작용 |

### useDialog

AlertDialog / ConfirmDialog를 명령형으로 표시.

**메서드**

| 메서드 | 설명 |
|--------|------|
| `openAlert(options)` | 단일 버튼 알림 |
| `openConfirm(options)` | 확인/취소 다이얼로그 |
| `openAsyncConfirm(options)` | 비동기 처리 + 로딩 상태 자동 표시 |

**AlertOptions**: `title`(필수), `description`, 버튼 커스텀, `closeOnDimmerClick`, 생명주기 콜백

기본 버튼 텍스트: 알림 `"확인"`, 확인 `"확인"/"취소"`

### useToast

짧은 알림 메시지 표시.

**환경별 동작 차이**
- **웹**: 3000ms(버튼 없음)/5000ms(버튼 있음) 자동 닫힘, `duration` 커스텀 가능, `closeToast` 수동 닫기
- **앱**: Android 상단 26px / iOS 46px 기본 위치, SafeArea·BottomCTA 높이 자동 반영, 수동 닫기 없음

**주요 옵션**: `type`(top/bottom), `gap`, `icon`/`iconType`, `button`(`text`+`onClick`), `higherThanCTA`, `duration`

### useBottomSheet

BottomSheet를 명령형으로 표시.

**메서드**

| 메서드 | 설명 |
|--------|------|
| `open(options)` | 기본 바텀시트 |
| `openOneButtonSheet(options)` | 단일 버튼 (기본 "확인") |
| `openTwoButtonSheet(options)` | 이중 버튼 |
| `openAsyncTwoButtonSheet(options)` | 비동기 + 버튼 로딩 상태 |

**공통 옵션**: `closeOnDimmerClick`(기본 true), `onEntered`/`onExited`, `topAccessory`/`bottomAccessory`, `UNSAFE_disableFocusLock`

버튼은 문자열(기본 버튼 생성) 또는 커스텀 ReactElement 지원.
