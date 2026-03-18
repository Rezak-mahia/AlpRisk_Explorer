import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  }
})