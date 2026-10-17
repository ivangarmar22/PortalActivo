import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) }

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./src/tests/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/tests/integration/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          // Lee .env.local (URL, clave anon y service_role locales) solo para estas pruebas.
          env: loadEnv('development', process.cwd(), ''),
          environment: 'node',
          globals: true,
          include: ['src/tests/integration/**/*.test.ts'],
          testTimeout: 30_000,
          fileParallelism: false,
        },
      },
    ],
  },
})
