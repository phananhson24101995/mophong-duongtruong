import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * @file vite.config.ts
 * @description Cấu hình Vite cho Web App - Sát hạch Đường trường Pro.
 * - Tích hợp PWA để cài đặt lên màn hình chính điện thoại
 * - Alias "@shared" trỏ đến packages/shared/src (dùng absolute path cố định)
 */

// Sử dụng đường dẫn tuyệt đối để tránh lỗi ESM trên Windows
const SHARED_PATH = 'E:/ViberCoding/UngDungMoPhongDuongTruong/packages/shared/src';

export default defineConfig({
  plugins: [
    // Plugin React (Fast Refresh)
    react(),

    // Plugin PWA - Tối ưu cài đặt lên màn hình chính
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Sát hạch Đường trường Pro',
        short_name: 'Đường Trường Pro',
        description: 'Hệ thống sát hạch lái xe đường trường dành cho giám thị',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],

  resolve: {
    alias: {
      // Alias @shared trỏ đến packages/shared/src
      '@shared': SHARED_PATH,
    },
  },

  server: {
    port: 5173,
    host: true,
  },
});
