import { Router } from 'express'
import Cliente from '../models/Cliente'
import { DEFAULT_STREAK_TIERS, type IStreakTier } from '../models/StreakConfig'
import { requireAuth } from '../lib/auth'
import { requireAdmin } from '../lib/adminAuth'
import { getStreakConfig, descontoParaStreak, proximoTier } from '../lib/streak'

const router = Router()

/**
 * GET /api/streak/config
 * Escada de recompensas (pública — o client mostra os escalões e próximas recompensas).
 */
router.get('/config', async (_req, res, next) => {
	try {
		const config = await getStreakConfig()
		res.json({ tiers: config.tiers })
	} catch (err) {
		next(err)
	}
})

/**
 * PUT /api/streak/config   (admin)
 * Body: { tiers: IStreakTier[] }
 * Substitui a escada de recompensas. Valida e ordena por dias.
 */
router.put('/config', requireAdmin, async (req, res, next) => {
	try {
		const { tiers } = req.body as { tiers: IStreakTier[] }
		if (!Array.isArray(tiers) || tiers.length === 0) {
			return res.status(400).json({ error: 'tiers deve ser uma lista não vazia' })
		}
		for (const t of tiers) {
			if (typeof t.dias !== 'number' || t.dias < 1) {
				return res.status(400).json({ error: 'Cada escalão precisa de dias ≥ 1' })
			}
			if (t.tipo !== 'desconto' && t.tipo !== 'item_gratis') {
				return res.status(400).json({ error: 'tipo deve ser desconto ou item_gratis' })
			}
			if (!t.descricao?.trim()) {
				return res.status(400).json({ error: 'Cada escalão precisa de descrição' })
			}
		}

		const ordenados = [...tiers]
			.map((t) => ({ dias: t.dias, tipo: t.tipo, valor: Number(t.valor) || 0, descricao: t.descricao.trim() }))
			.sort((a, b) => a.dias - b.dias)

		const config = await getStreakConfig()
		config.tiers = ordenados
		await config.save()
		res.json({ tiers: config.tiers })
	} catch (err) {
		next(err)
	}
})

/**
 * POST /api/streak/config/reset   (admin) → repõe os defaults.
 */
router.post('/config/reset', requireAdmin, async (_req, res, next) => {
	try {
		const config = await getStreakConfig()
		config.tiers = DEFAULT_STREAK_TIERS
		await config.save()
		res.json({ tiers: config.tiers })
	} catch (err) {
		next(err)
	}
})

/**
 * GET /api/streak/me   (auth)
 * Estado de streak do cliente da sessão + desconto atual e próxima recompensa.
 */
router.get('/me', requireAuth, async (req, res, next) => {
	try {
		const cliente = req.cliente!
		const config = await getStreakConfig()
		const streak = cliente.streakAtual ?? 0

		res.json({
			streakAtual: streak,
			maiorStreak: cliente.maiorStreak ?? 0,
			ultimoDiaPedido: cliente.ultimoDiaPedido ?? null,
			descontoAtual: descontoParaStreak(streak, config.tiers),
			proximaRecompensa: proximoTier(streak, config.tiers),
			tiers: config.tiers,
			recompensasGanhas: cliente.recompensasGanhas ?? [],
		})
	} catch (err) {
		next(err)
	}
})

/**
 * GET /api/streak/clientes   (admin)
 * Lista de clientes ordenada por streak atual (para o painel do admin).
 */
router.get('/clientes', requireAdmin, async (_req, res, next) => {
	try {
		const clientes = await Cliente.find()
			.select('telefone nome streakAtual maiorStreak ultimoDiaPedido recompensasGanhas')
			.sort({ streakAtual: -1, maiorStreak: -1 })
			.lean()
		res.json(clientes)
	} catch (err) {
		next(err)
	}
})

export default router
