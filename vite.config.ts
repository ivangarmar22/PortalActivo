import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        // Librerías en trozos propios: cambian poco y el navegador las conserva en caché entre versiones.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'radix', test: /node_modules[\\/](radix-ui|@radix-ui)[\\/]/ },
          ],
        },
      },
    },
  },
})
