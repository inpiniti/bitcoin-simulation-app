---
title: Bitcoin Simulation App
emoji: 🪙
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Bitcoin Simulation App

Bitcoin 자동매매 시뮬레이션 앱 (Expo Web).

## 주요 기능
- 서버 상태 모니터링 및 실시간 감지 제어
- AI 질문 및 시장 감성 분석 (Gemini)
- 딥러닝 스튜디오 (학습 현황 트래킹)
- 자동매매 설정 및 이력 관리
- 포트폴리오 자산 배분 제안
- **실시간 자산 및 실시간 매매 통합 대시보드 (신규)**
  - 자산 탭에서 실시간 가격 변동을 연계하여 실시간 평가금액 및 수익률 반영
  - 설정된 기준가 대비 실시간 시세의 변화율을 동적 게이지 바로 시각화
  - 갭(Gap)과 보유 수량의 연산을 통한 동적 캐릭터 레벨링(LV0 ~ LV23) 이미지 매핑

## 백엔드
- [bitcoin-ai-backend](https://huggingface.co/spaces/younginpiniti/bitcoin-ai-backend)
