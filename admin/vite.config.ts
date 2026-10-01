import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    port: 5174,
    // Falha se a porta já estiver ocupada em vez de avançar em silêncio para
    // 5175/5176/... — uma segunda instância (ex.: `npm run dev` corrido duas
    // vezes por engano) acabava numa porta fora do CORS_ORIGIN do servidor,
    // e todos os pedidos da API falhavam sem aviso nenhum no browser.
    strictPort: true,
  },
})
