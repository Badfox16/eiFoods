/**
 * Migração best-effort: PratoDoDia + Prato.disponivel → Menu (menu por dia).
 *
 * Cria (ou completa) o Menu do dia atual (timezone Maputo) a partir de:
 *   1. Pratos com `disponivel: true`
 *   2. O prato agendado para hoje em PratoDoDia (marcado como `destaque`)
 *
 * Não apaga nem altera dados antigos (PratoDoDia / Prato.disponivel ficam intactos).
 * Idempotente: se o Menu de hoje já existir, faz merge sem duplicar itens.
 *
 * Correr: `bun migrate-pratodia-to-menu.ts` (ou `npm run migrate:pratodia-to-menu`).
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Menu, { getCurrentMenuDateKey, type IMenuItem } from './models/Menu'
import Prato from './models/Prato'
import PratoDoDia, { type DiaSemana } from './models/PratoDoDia'
import { getMaputoWeekdayNumber } from './lib/businessTime'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })

// Map getMaputoWeekdayNumber (0=Dom, 1=Seg...) → DiaSemana
const DAY_MAP: Record<number, DiaSemana | undefined> = {
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
}

async function runMigration() {
  const uri = process.env['MONGO_URI'] ?? process.env['mongo_uri']
  if (!uri) throw new Error('MONGO_URI não definida no .env')

  const dbName = process.env['MONGO_DB_NAME'] ?? process.env['mongo_db_name'] ?? 'marmita_db'
  await mongoose.connect(uri, { dbName })
  console.log('[Migration] MongoDB conectado')

  const data = getCurrentMenuDateKey()

  // 1. Prato do dia agendado (para hoje) → destaque
  const diaSemana = DAY_MAP[getMaputoWeekdayNumber()]
  let destaqueId: string | null = null
  if (diaSemana) {
    const agenda = await PratoDoDia.findOne()
    const entrada = agenda?.semana.find((d) => d.diaSemana === diaSemana)
    if (entrada?.prato) destaqueId = String(entrada.prato)
  }

  // 2. Pratos disponíveis
  const disponiveis = await Prato.find({ disponivel: true }).select('_id')
  const disponiveisIds = disponiveis.map((p) => String(p._id))

  // Conjunto de pratos do menu (destaque + disponíveis, sem duplicar)
  const idSet = new Set<string>(disponiveisIds)
  if (destaqueId) idSet.add(destaqueId)

  if (idSet.size === 0) {
    console.log('[Migration] Nenhum prato disponível nem agendado — nada a migrar')
    await mongoose.disconnect()
    return
  }

  const novosItens: IMenuItem[] = [...idSet].map((id) => ({
    pratoId: id as never,
    destaque: id === destaqueId,
    exclusivo: false,
  }))

  const existente = await Menu.findOne({ data })

  if (!existente) {
    await Menu.create({ data, itens: novosItens, ativo: true })
    console.log(`[Migration] Menu criado para ${data} com ${novosItens.length} itens (destaque: ${destaqueId ?? 'nenhum'})`)
  } else {
    // Merge: adiciona pratos em falta sem remover os que já existem
    const existentesIds = new Set(existente.itens.map((i) => String(i.pratoId)))
    let added = 0
    for (const item of novosItens) {
      if (!existentesIds.has(String(item.pratoId))) {
        existente.itens.push(item)
        added += 1
      }
    }
    await existente.save()
    console.log(`[Migration] Menu de ${data} já existia — ${added} itens adicionados`)
  }

  await mongoose.disconnect()
  console.log('[Migration] Concluída')
}

runMigration().catch(async (err) => {
  console.error('[Migration] Falha:', err)
  await mongoose.disconnect()
  process.exit(1)
})
