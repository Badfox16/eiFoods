import { Router } from 'express'
import PlanoMenu, { CATEGORIAS_COM_MENU_PROPRIO, type CategoriaComMenuProprio, type IPlanoMenuItem } from '../models/PlanoMenu'
import Prato from '../models/Prato'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

/**
 * Menus dos planos Premium Nutrição (Fase 7). Um cardápio fixo por categoria
 * (`premium_fit_starter` / `premium_muscle`), separado do menu normal do dia
 * — `classico` não tem rota aqui, continua a usar `GET /api/menu/hoje`.
 */

function isCategoriaValida(categoria: unknown): categoria is CategoriaComMenuProprio {
	return typeof categoria === 'string' && CATEGORIAS_COM_MENU_PROPRIO.includes(categoria as CategoriaComMenuProprio)
}

interface RawItem {
	pratoId: string
}

function parseItens(raw: unknown): RawItem[] | null {
	if (!Array.isArray(raw)) return null
	const out: RawItem[] = []
	for (const item of raw) {
		if (!item || typeof item !== 'object') return null
		const pratoId = (item as { pratoId?: unknown }).pratoId
		if (typeof pratoId !== 'string' || !pratoId) return null
		out.push({ pratoId })
	}
	return out
}

async function ensureAllPratosExist(pratoIds: string[]): Promise<boolean> {
	if (!pratoIds.length) return true
	const unique = [...new Set(pratoIds)]
	const count = await Prato.countDocuments({ _id: { $in: unique } })
	return count === unique.length
}

// ── GET /api/planos-menu/:categoria ─────────────────────────────────────────
// (público) Cardápio da categoria, com pratos populados. Devolve um menu
// vazio (não 404) se ainda não tiver sido configurado — mesmo padrão de
// GET /api/menu/hoje, para a UI tratar "ainda sem menu" sem branch extra.
router.get('/:categoria', async (req, res, next) => {
	try {
		const { categoria } = req.params
		if (!isCategoriaValida(categoria)) {
			return res.status(400).json({ error: `categoria deve ser uma de: ${CATEGORIAS_COM_MENU_PROPRIO.join(', ')}` })
		}
		const menu = await PlanoMenu.findOne({ categoria }).populate('itens.pratoId')
		if (!menu) {
			return res.json({ categoria, itens: [], ativo: false, message: 'Menu ainda não configurado para este plano' })
		}
		res.json(menu)
	} catch (err) {
		next(err)
	}
})

// ── PUT /api/planos-menu/:categoria ─────────────────────────────────────────
// (admin) Body: { itens: [{ pratoId }], ativo? }. Cria ou atualiza (upsert).
router.put('/:categoria', requireAdmin, async (req, res, next) => {
	try {
		const { categoria } = req.params
		if (!isCategoriaValida(categoria)) {
			return res.status(400).json({ error: `categoria deve ser uma de: ${CATEGORIAS_COM_MENU_PROPRIO.join(', ')}` })
		}

		const { itens: rawItens, ativo } = req.body as { itens?: unknown; ativo?: boolean }
		const parsed = parseItens(rawItens)
		if (parsed === null) {
			return res.status(400).json({ error: 'itens inválidos. Esperado array de { pratoId }' })
		}

		const okPratos = await ensureAllPratosExist(parsed.map((i) => i.pratoId))
		if (!okPratos) {
			return res.status(400).json({ error: 'Um ou mais pratos informados não existem' })
		}

		const itens: IPlanoMenuItem[] = parsed.map((i) => ({ pratoId: i.pratoId as never }))

		const update: Record<string, unknown> = { itens }
		if (ativo !== undefined) update['ativo'] = Boolean(ativo)

		const menu = await PlanoMenu.findOneAndUpdate(
			{ categoria },
			{ $set: update, $setOnInsert: { categoria } },
			{ new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
		).populate('itens.pratoId')

		res.json(menu)
	} catch (err) {
		next(err)
	}
})

export default router
