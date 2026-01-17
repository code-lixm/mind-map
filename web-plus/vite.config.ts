import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import vueDevTools from 'vite-plugin-vue-devtools'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 指向 simple-mind-map 目录，确保可以导入 src 下的文件
      'simple-mind-map': path.resolve(__dirname, '../simple-mind-map')
    },
    // 优先使用 module 字段（指向 index.js），而不是 main 字段（指向 dist）
    // 这样可以确保使用源码而不是构建后的 dist 文件
    mainFields: ['module', 'main'],
    preserveSymlinks: false
  },
  server: {
    watch: {
      // 监听 simple-mind-map/src 目录的变化
      ignored: [
        // 忽略 node_modules，但不忽略 simple-mind-map/src
        '**/node_modules/**',
        '**/dist/**',
        '!**/simple-mind-map/src/**'
      ]
    },
    fs: {
      // 允许访问 simple-mind-map 目录
      allow: ['..']
    }
  },
  optimizeDeps: {
    // 排除 simple-mind-map 的预构建，确保总是使用最新的源码
    // 这样 Vite 会直接处理源码文件，而不是使用预构建的缓存
    exclude: ['simple-mind-map']
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import']
      }
    }
  }
})
