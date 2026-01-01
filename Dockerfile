# 1. Base Image (Node 20 + wkhtmltopdf)
FROM ghcr.io/surnet/alpine-node-wkhtmltopdf:20.15.1-0.12.6-small

# 2. 한글 폰트 설치 (URL 다운로드 방식 X -> 공식 패키지 설치 O)
# font-noto-cjk: 한중일 통합 폰트 (오류 없이 가장 확실함)
RUN apk add --no-cache \
    font-noto-cjk \
    freetype \
    fontconfig \
    ttf-dejavu && \
    fc-cache -fv

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]