# Node 20 + wkhtmltopdf 베이스 이미지
FROM ghcr.io/surnet/alpine-node-wkhtmltopdf:20.15.1-0.12.6-small

# 한글 폰트 설치 (URL 수정됨: NotoSansKR-Regular.ttf)
RUN apk add --no-cache fontconfig ttf-dejavu wget && \
    mkdir -p /usr/share/fonts/noto && \
    wget -O /usr/share/fonts/noto/NotoSansKR-Regular.ttf https://github.com/google/fonts/raw/main/ofl/notosanskr/NotoSansKR-Regular.ttf && \
    fc-cache -fv

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]