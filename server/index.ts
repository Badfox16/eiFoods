import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import swaggerUi from 'swagger-ui-express'
import pratosRouter from './routes/pratos.ts'
import extrasRouter from './routes/extras.ts'
import pratoDoDiaRouter from './routes/pratoDoDia.ts'
import menuRouter from './routes/menu.ts'
import ordersRouter from './routes/orders.ts'
import sorteioRouter from './routes/sorteio.ts'
import empresasRouter from './routes/empresas.ts'
import authRouter from './routes/auth.ts'
import adminRouter from './routes/admin.ts'
import streakRouter from './routes/streak.ts'
import planosRouter from './routes/planos.ts'
import subscricoesRouter from './routes/subscricoes.ts'
import planosMenuRouter from './routes/planosMenu.ts'
import swaggerSpec from './lib/swagger.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })

const app = express()
const PORT = process.env['PORT'] ?? 3000

// ── Middleware ──────────────────────────────────────────────────────────────

const allowedOrigins = (process.env['CORS_ORIGIN'] ?? '').split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// HTTP request logger
const isDev = (process.env['NODE_ENV'] ?? 'development') === 'development'
app.use(morgan(isDev ? 'dev' : 'combined'))

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected'
  res.json({ status: 'ok', db: dbStatus, timestamp: new Date().toISOString() })
})

app.use('/api/pratos', pratosRouter)
app.use('/api/extras', extrasRouter)
// @deprecated — substituído por /api/menu (menu por data de calendário). Mantido temporariamente.
app.use('/api/prato-do-dia', pratoDoDiaRouter)
app.use('/api/menu', menuRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/sorteio', sorteioRouter)
app.use('/api/empresas', empresasRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)
app.use('/api/streak', streakRouter)
app.use('/api/planos', planosRouter)
app.use('/api/subscricoes', subscricoesRouter)
app.use('/api/planos-menu', planosMenuRouter)

// ── API Docs (Swagger UI) ────────────────────────────────────────────────────

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))

// ── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ── Global error handler ────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: err.message ?? 'Erro interno do servidor' })
})

// ── Database + Server ───────────────────────────────────────────────────────

async function start() {
  const uri = process.env['MONGO_URI'] ?? process.env['mongo_uri']
  if (!uri) throw new Error('MONGO_URI não definida no .env')

  const dbName = process.env['MONGO_DB_NAME'] ?? process.env['mongo_db_name'] ?? 'marmita_db'
  await mongoose.connect(uri, { dbName })
  console.log('[DB] MongoDB conectado')

  app.listen(PORT, () => {
    console.log(`[Server] Servidor a correr em http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('[Fatal]', err)
  process.exit(1)
})