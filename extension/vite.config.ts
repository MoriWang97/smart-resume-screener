import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// 主构建：popup, sidepanel, background（支持 ES modules）
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/sidepanel.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content-boss': resolve(__dirname, 'src/content/boss.ts'),
        'content-zhaopin': resolve(__dirname, 'src/content/zhaopin.ts'),
        'content-liepin': resolve(__dirname, 'src/content/liepin.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    minify: process.env.NODE_ENV === 'production',
  },
});
