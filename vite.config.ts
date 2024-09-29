import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import VueRouter from 'unplugin-vue-router/vite'


// https://vitejs.dev/config/
export default defineConfig({
  base: '/money-log/',
  plugins: [
    VueRouter({
      /* options */
    }),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Money Log',
        short_name: 'Money Log',
        description: 'A simple money log app',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        screenshots: [
          {
            form_factor: 'narrow',
            sizes: '750x1334',
            src: 'screenshot-750x1334.png'
          }
        ]
      }
    })
  ],
})
