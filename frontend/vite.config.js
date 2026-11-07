import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Preload the two fonts the hero headline and body need for first paint (LCP), using the
 * hashed file names Vite emits. Everything else keeps loading lazily via @font-face.
 */
function preloadCriticalFonts() {
  const critical = [/instrument-serif-latin-400-normal.*\.woff2$/, /geist-latin-wght-normal.*\.woff2$/]
  return {
    name: 'medoshield:preload-critical-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle || {}).filter((f) => critical.some((re) => re.test(f)))
        const tags = files.map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`).join('\n    ')
        return tags ? html.replace('<!--seo:start-->', `${tags}\n    <!--seo:start-->`) : html
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'
  return {
    plugins: [react(), preloadCriticalFonts()],
    server: {
      port: 5173,
      host: true,
      // Same-origin proxy in dev: the httpOnly refresh cookie just works (no CORS / SameSite pain).
      proxy: { '/api': { target, changeOrigin: true }, '/health': { target, changeOrigin: true } },
    },
    preview: { port: 4173 },
    esbuild: { legalComments: 'none' },
    build: {
      target: 'es2020',
      sourcemap: false,
      cssMinify: true,
      minify: 'esbuild',
      reportCompressedSize: false,
      assetsInlineLimit: 2048,
      chunkSizeWarningLimit: 1400,
      // Don't eagerly <link rel="modulepreload"> heavy lazy chunks (3D, charts, pose) on the landing page.
      modulePreload: { resolveDependencies: (_file, deps) => deps.filter((d) => !/three|charts|vision|Markdown/.test(d)) },
      rollupOptions: {
        output: {
          // Path-based (not package-list) chunking: the object form also drags shared helpers
          // such as clsx/scheduler into these chunks, which made every page import 3D + charts.
          manualChunks(id) {
            if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'vendor'
            if (!id.includes('node_modules')) return undefined
            // Small libraries shared by the app shell AND the heavy chunks: pin them to a common
            // vendor chunk, otherwise Rollup folds them into three/charts and every page imports those.
            if (/node_modules[\\/](react|react-dom|scheduler|zustand|use-sync-external-store|clsx|react-is|@babel[\\/]runtime|tslib|prop-types|eventemitter3|tiny-invariant|its-fine|suspend-react|react-use-measure|lodash)[\\/]/.test(id)) return 'vendor'
            if (/node_modules[\\/](three|three-stdlib|@react-three|troika-|meshline|maath|camera-controls|stats-gl|@monogrid)/.test(id)) return 'three'
            if (/node_modules[\\/](recharts|d3-|victory-vendor|recharts-scale|decimal\.js-light|internmap)/.test(id)) return 'charts'
            if (/node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion'
            if (/node_modules[\\/]@mediapipe[\\/]/.test(id)) return 'vision'
            return undefined
          },
        },
      },
    },
  }
})
