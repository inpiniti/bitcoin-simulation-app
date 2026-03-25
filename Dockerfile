# 로컬에서 미리 빌드된 dist 폴더를 직접 서빙
FROM nginx:alpine

# HuggingFace Spaces: port 7860 필수
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 로컬 빌드 결과물 복사
COPY dist /usr/share/nginx/html

EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]
