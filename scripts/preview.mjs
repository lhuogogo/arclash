#!/usr/bin/env node
/**
 * Build and serve the browser preview.
 *
 * The app router matches `/` only — that is what the Tauri custom protocol
 * serves in production (`http://tauri.localhost/`), so a preview page at
 * `/preview.html` renders the router's 404 instead of the UI. This script
 * therefore renames the built entry to `index.html` and serves it at the root,
 * so the preview URL matches production exactly.
 *
 * Usage:
 *   node scripts/preview.mjs          build, then serve on :8802
 *   node scripts/preview.mjs --dev    HMR dev server (no build step)
 */
import { spawn } from 'node:child_process'
import { existsSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'dist-preview')
const dev = process.argv.includes('--dev')

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'vite', ...args], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    })
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`vite exited with ${code}`)),
    )
  })

if (dev) {
  // The dev server resolves `/` to `preview.html` through `appType: 'spa'`
  // only if that file is the configured entry, so serving the built directory
  // is the path that keeps the URL identical to production. `--dev` still
  // builds first for that reason; it only skips the static server.
  console.log('[preview] --dev builds too; the URL must stay "/" to match production')
}

console.log('[preview] building…')
await run(['build', '-c', 'vite.preview.config.mts'])

const built = path.join(outDir, 'preview.html')
const target = path.join(outDir, 'index.html')
if (!existsSync(built)) {
  throw new Error(`[preview] expected ${built}; the entry name may have changed`)
}
if (existsSync(target)) rmSync(target)
renameSync(built, target)
console.log('[preview] dist-preview/index.html ready')

console.log('[preview] serving on http://127.0.0.1:8802/')
const server = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '-c', 'vite.preview.config.mts', '--port', '8802', '--strictPort'],
  { cwd: root, stdio: 'inherit', shell: true },
)

process.on('SIGINT', () => {
  server.kill()
  process.exit(0)
})
