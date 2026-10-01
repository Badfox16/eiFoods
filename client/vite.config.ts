import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    // Falha se a porta já estiver ocupada em vez de avançar em silêncio para
    // 5174/5175/... — uma segunda instância (ex.: `npm run dev` corrido duas
    // vezes por engano) acabava numa porta fora do CORS_ORIGIN do servidor,
    // e todos os pedidos da API falhavam sem aviso nenhum no browser.
    strictPort: true,
  },
})
