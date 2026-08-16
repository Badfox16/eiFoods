import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { randomInt } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Empresa, { getCurrentDateKey } from './models/Empresa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })

function generateEmployeeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'EMP-'
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[randomInt(alphabet.length)]
  }
  return code
}

async function buildUniqueCode(): Promise<string> {
  while (true) {
    const code = generateEmployeeCode()
    const exists = await Empresa.exists({ codigo: code })
    if (!exists) return code
  }
}

async function runMigration() {
  const uri = process.env['MONGO_URI'] ?? process.env['mongo_uri']
  if (!uri) throw new Error('MONGO_URI não definida no .env')

  const dbName = process.env['MONGO_DB_NAME'] ?? process.env['mongo_db_name'] ?? 'marmita_db'
  await mongoose.connect(uri, { dbName })
  console.log('[Migration] MongoDB conectado')

  const indexes = await Empresa.collection.indexes()
  const legacyCodeIndex = indexes.find((idx) => idx.name === 'codigos.code_1')
  if (legacyCodeIndex) {
    await Empresa.collection.dropIndex('codigos.code_1')
    console.log('[Migration] Índice legado codigos.code_1 removido')
  }

  const empresas = await Empresa.find()
  const today = getCurrentDateKey()
  let migrated = 0

  for (const empresa of empresas) {
    const code = await buildUniqueCode()
    empresa.codigo = code
    empresa.codigoAtivo = true
    empresa.maxUsosDia = empresa.maxUsosDia && empresa.maxUsosDia > 0 ? empresa.maxUsosDia : 1
    empresa.usosDiaAtual = 0
    empresa.ultimoResetDia = today

    await empresa.save()
    migrated += 1
  }

  await Empresa.collection.updateMany({}, { $unset: { codigos: '' } })
  await Empresa.collection.createIndex({ codigo: 1 }, { unique: true })

  console.log(`[Migration] Empresas migradas: ${migrated}`)
  await mongoose.disconnect()
}

runMigration().catch(async (err) => {
  console.error('[Migration] Falha:', err)
  await mongoose.disconnect()
  process.exit(1)
})
