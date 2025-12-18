import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 외부 접속 허용
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
  },
  preview: {
    host: '0.0.0.0', // 빌드 후 실행 시에도 외부 접속 허용
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    allowedHosts: true // Railway 도메인 허용
  }
})