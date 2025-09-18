import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'

// NOTE: If your Pages URL is username.github.io/ProList_Export,
// keep '/ProList_Export/'. If you deploy to root/custom domain, use '/'.
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  return {
    base: isDev ? '/' : '/ProList_Export/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
