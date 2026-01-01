# 1. Base Image
FROM ghcr.io/surnet/alpine-node-wkhtmltopdf:20.15.1-0.12.6-small

# 2. 한글 폰트 설치
RUN apk add --no-cache \
    font-noto-cjk \
    freetype \
    fontconfig \
    ttf-dejavu && \
    fc-cache -fv

WORKDIR /app

COPY package*.json ./

# 3. 의존성 설치
RUN npm install

COPY . .

# [추가됨] 4. React 앱 빌드 (src -> dist 폴더로 변환)
RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]