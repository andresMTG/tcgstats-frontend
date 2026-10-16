import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: environment.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
      allowedHosts: [environment.VITE_ALLOWED_HOST || 'localhost' || environment.VITE_ALLOWED_HOST2],
    },
  }
})
