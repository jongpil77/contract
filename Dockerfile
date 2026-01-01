# 기존 18.16.0 태그가 없어져서, 존재하는 최신 Node 20 버전으로 변경
FROM ghcr.io/surnet/alpine-node-wkhtmltopdf:20.15.1-0.12.6-small

# 한글 폰트 설치 (Noto Sans KR)
RUN apk add --no-cache fontconfig ttf-dejavu wget && \
    mkdir -p /usr/share/fonts/noto && \
    wget -O /usr/share/fonts/noto/NotoSansKR-Regular.otf https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansKR-Regular.otf && \
    fc-cache -fv

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]