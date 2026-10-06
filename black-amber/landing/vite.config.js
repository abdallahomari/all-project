import { defineConfig } from 'vite'

// `npm run build:offline` makes a copy that opens by double-clicking index.html (file://):
// browsers block module scripts and CORS-mode assets there, so emit a classic deferred script.
const offlineHtml = {
  name: 'offline-html',
  enforce: 'post',
  transformIndexHtml(html) {
    return html.replace(/ type="module"/g, ' defer').replace(/ crossorigin/g, '')
  },
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    base: './',
    plugins: offline ? [offlineHtml] : [],
    build: {
      target: 'es2020',
      assetsInlineLimit: 0,
      outDir: offline ? 'dist-offline' : 'dist',
      modulePreload: offline ? false : undefined,
      rollupOptions: offline ? { output: { format: 'iife', inlineDynamicImports: true } } : {},
    },
  }
})
