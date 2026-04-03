import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!/node_modules[\\/]/.test(id)) {
            return undefined
          }

          if (/node_modules[\\/](cesium|@cesium)[\\/]/.test(id)) {
            return 'cesium'
          }

          if (/node_modules[\\/]ol[\\/]/.test(id)) {
            return 'openlayers'
          }

          if (/node_modules[\\/]proj4[\\/]/.test(id)) {
            return 'projection'
          }

          return 'vendor'
        }
      }
    }
  }
})