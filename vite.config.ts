import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        headers: {
          'Origin': 'https://api.anthropic.com',
        },
      },
      // 东方财富 / 天天基金 API 代理（绕过 CORS）
      '/api/em/fundlist': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
        rewrite: () => '/js/fundcode_search.js',
        headers: { Referer: 'https://fund.eastmoney.com/' },
      },
      '/api/em/detail': {
        target: 'https://fund.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em\/detail/, '/pingzhongdata'),
        headers: { Referer: 'https://fund.eastmoney.com/' },
      },
      '/api/em/realtime': {
        target: 'https://fundgz.1234567.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/em\/realtime/, '/js'),
        headers: { Referer: 'https://fund.eastmoney.com/' },
      },
    },
  },
})
