import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { execSync } from 'child_process'

const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
const buildTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
