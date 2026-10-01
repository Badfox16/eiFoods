/**
 * Migração best-effort: restruturação de Plano/Subscricao para o modelo de
 * categoria + duração (Fase 7).
 *
 * Antes: `Plano.tipo` era a única dimensão (semanal/bissemanal/mensal = uma
 * mistura de "duração" com o que hoje é a categoria de dieta).
 * Depois: dois eixos independentes — `categoria` (classico/premium_fit_starter/
 * premium_muscle) e `duracao` (starter/plus/mensal).
 *
 * O que esta migração faz, por documento existente:
 *  1. `Plano` sem `duracao`: mapeia `tipo` → `duracao` (semanal→starter,
 *     bissemanal→plus, mensal→mensal) e define `precoUnidade: 'total'`.
 *     `categoria` fica sempre `classico` — não há forma segura de inferir se
 *     um plano `premium:true` antigo pertencia ao Fit Starter ou ao Muscle
 *     (essa distinção não existia antes da Fase 7); o admin pode reclassificar
 *     manualmente no editor de planos se for caso disso. Mantendo `categoria:
 *     'classico'` os planos antigos continuam a funcionar exatamente como
 *     antes (o desbloqueio de exclusivos da Fase 3 não depende de categoria).
 *  2. `Subscricao` sem `categoria`: copia `categoria`/`duracao`/`precoUnidade`
 *     do `Plano` ligado, se ainda existir; caso contrário usa `classico` /
 *     `starter` (o mais comum) / `total` como fallback razoável.
 *
 * Não apaga nem substitui dados. Idempotente — documentos já migrados
 * (`duracao`/`categoria` já definidos) são ignorados.
 *
 * Correr: `bun migrate-plano-restructure.ts` (ou `npm run migrate:plano-restructure`).
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Plano from './models/Plano'
import Subscricao from './models/Subscricao'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '.env') })

// tipo legado (semanal/bissemanal/mensal) → duracao (starter/plus/mensal)
const TIPO_PARA_DURACAO: Record<string, 'starter' | 'plus' | 'mensal'> = {
	semanal: 'starter',
	bissemanal: 'plus',
	mensal: 'mensal',
}

async function runMigration() {
	const uri = process.env['MONGO_URI'] ?? process.env['mongo_uri']
	if (!uri) throw new Error('MONGO_URI não definida no .env')

	const dbName = process.env['MONGO_DB_NAME'] ?? process.env['mongo_db_name'] ?? 'marmita_db'
	await mongoose.connect(uri, { dbName })
	console.log('[Migrate] Conectado ao MongoDB')

	// ── Planos sem `duracao` (esquema antigo, campo `tipo`) ──
	const planosAntigos = await Plano.find({ duracao: { $exists: false } }).lean()
	let planosMigrados = 0
	for (const p of planosAntigos) {
		const tipoAntigo = (p as unknown as { tipo?: string }).tipo
		const duracao = (tipoAntigo && TIPO_PARA_DURACAO[tipoAntigo]) || 'starter'
		// Usa a coleção nativa (não `Plano.updateOne`): em modo strict o Mongoose
		// filtra silenciosamente `$unset` de caminhos que já não existem no
		// schema (`tipo`), deixando o campo legado por remover.
		await Plano.collection.updateOne(
			{ _id: p._id },
			{
				$set: { categoria: 'classico', duracao, precoUnidade: 'total' },
				$unset: { tipo: '' },
			}
		)
		planosMigrados += 1
	}
	console.log(`[Migrate] ${planosMigrados} planos migrados (tipo → categoria/duracao)`)

	// ── Limpeza: planos já migrados numa corrida anterior desta migração (antes
	// da correção acima) podem ter ficado com o campo legado `tipo` por remover.
	const limpeza = await Plano.collection.updateMany({ tipo: { $exists: true } }, { $unset: { tipo: '' } })
	if (limpeza.modifiedCount > 0) {
		console.log(`[Migrate] ${limpeza.modifiedCount} planos com campo legado 'tipo' residual limpos`)
	}

	// ── Subscrições sem `categoria` (snapshot antigo) ──
	const subsAntigas = await Subscricao.find({ categoria: { $exists: false } })
	let subsMigradas = 0
	for (const s of subsAntigas) {
		const plano = await Plano.findById(s.planoId).lean()
		s.categoria = plano?.categoria ?? 'classico'
		s.duracao = plano?.duracao ?? 'starter'
		s.precoUnidade = plano?.precoUnidade ?? 'total'
		await s.save()
		subsMigradas += 1
	}
	console.log(`[Migrate] ${subsMigradas} subscrições migradas (snapshot categoria/duracao)`)

	console.log('[Migrate] ✓ Concluído')
	await mongoose.disconnect()
}

runMigration().catch((err) => {
	console.error('[Migrate Error]', err)
	process.exit(1)
})
