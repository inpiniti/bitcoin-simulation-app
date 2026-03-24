# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# 의존성 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사
COPY . .

# Expo web 빌드
# EXPO_PUBLIC_* 변수는 빌드 시점에 번들에 포함됨
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

RUN npx expo export --platform web

# ── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# HuggingFace Spaces: port 7860 필수
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사 (expo export → dist/)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]
