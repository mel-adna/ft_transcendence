import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const coreApiTarget = env.CORE_API_PROXY_TARGET ?? 'http://localhost:8080'
  const chatTarget = env.CHAT_PROXY_TARGET ?? 'http://localhost:5005'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/v1': {
          target: coreApiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin')
            })
          },
        },
        '/api/chat': {
          target: chatTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: chatTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
