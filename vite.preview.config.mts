import path from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

/**
 * Preview build: the real UI plus a Tauri IPC mock, served in a plain browser.
 *
 * Kept as its own config rather than a mode on `vite.config.mts` because the
 * preview needs a different entry set (and the legacy/polyfill plugins are
 * pointless here). Nothing in this config reaches the application bundle.
 *
 * Usage: `pnpm web:preview` (build + serve) or `pnpm web:preview:dev` (HMR).
 */
export default defineConfig(() => ({
  root: 'src',
  server: { port: 8802 },
  preview: { port: 8802 },
  plugins: [svgr(), react()],
  build: {
    // Deliberately separate from `../dist`: reusing the app's output directory
    // would let `web:build` wipe the preview, and vice versa.
    outDir: '../dist-preview',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        preview: path.resolve('./src/preview.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@root': path.resolve('.'),
      'monaco-editor/esm/vs/editor/editor.worker.js':
        'monaco-editor/editor/editor.worker',
    },
  },
  define: {
    OS_PLATFORM: `"${process.platform}"`,
  },
}))
