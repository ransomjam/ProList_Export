import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'

// Allow overriding the base path through an environment variable so the
// project can be hosted from a subdirectory when needed (e.g. GitHub Pages).
// For platforms like Vercel that serve the app from the domain root we keep
// the default '/' to avoid broken asset links that lead to a blank page.
const normaliseBase = (value?: string | null) => {
  if (!value) return '/'
  const trimmed = value.trim()
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  const base = normaliseBase(process.env.VITE_APP_BASE)

  return {
    base: isDev ? '/' : base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      allowedHosts: [/\.janeway\.replit\.dev$/],
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 5000,
      strictPort: true,
    },
  }
})
