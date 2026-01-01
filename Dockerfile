# 1. Base Image (Node 20 + wkhtmltopdf)
FROM ghcr.io/surnet/alpine-node-wkhtmltopdf:20.15.1-0.12.6-small

# 2. 한글 폰트 설치 (공식 패키지 사용으로 404 에러 방지)
RUN apk add --no-cache \
    font-noto-cjk \
    freetype \
    fontconfig \
    ttf-dejavu && \
    fc-cache -fv

WORKDIR /app

COPY package*.json ./

# [중요 변경점] npm ci -> npm install로 변경
# npm install은 lock 파일이 안 맞아도 알아서 맞춰서 설치해줍니다.
RUN npm install --only=production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]