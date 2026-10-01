import { Router } from 'express'
import Plano, { type DuracaoPlano, type TipoPlano, type PrecoUnidade } from '../models/Plano'
import { requireAdmin } from '../lib/adminAuth'

const router = Router()

const VALID_DURACOES: DuracaoPlano[] = ['starter', 'plus', 'mensal']
const VALID_CATEGORIAS: TipoPlano[] = ['classico', 'premium_fit_starter', 'premium_muscle', 'premium_equilibrio']
const VALID_PRECO_UNIDADES: PrecoUnidade[] = ['total', 'por_refeicao']

/**
 * GET /api/planos          (público)
 * Lista de planos. Por omissão apenas os ativos (o client mostra estes);
 * `?todos=1` devolve também os inativos (para o admin).
 * `?categoria=` filtra por categoria (classico/premium_fit_starter/premium_muscle).
 */
router.get('/', async (req, res, next) => {
	try {
		const filter: Record<string, unknown> = req.query['todos'] === '1' ? {} : { ativo: true }
		const categoria = req.query['categoria']
		if (typeof categoria === 'string' && VALID_CATEGORIAS.includes(categoria as TipoPlano)) {
			filter['categoria'] = categoria
		}
		const planos = await Plano.find(filter).sort({ categoria: 1, preco: 1 })
		res.json(planos)
	} catch (err) {
		next(err)
	}
})

/**
 * GET /api/planos/:id      (público)
 */
router.get('/:id', async (req, res, next) => {
	try {
		const plano = await Plano.findById(req.params['id'])
		if (!plano) return res.status(404).json({ error: 'Plano não encontrado' })
		res.json(plano)
	} catch (err) {
		next(err)
	}
})

function validarCorpo(body: Record<string, unknown>): string | null {
	const { nome, categoria, duracao, numRefeicoes, preco, precoUnidade, validadeDias } = body
	if (!nome || typeof nome !== 'string' || !nome.trim()) return 'Nome é obrigatório'
	if (typeof categoria !== 'string' || !VALID_CATEGORIAS.includes(categoria as TipoPlano)) {
		return `categoria deve ser uma de: ${VALID_CATEGORIAS.join(', ')}`
	}
	if (typeof duracao !== 'string' || !VALID_DURACOES.includes(duracao as DuracaoPlano)) {
		return `duracao deve ser uma de: ${VALID_DURACOES.join(', ')}`
	}
	if (typeof numRefeicoes !== 'number' || numRefeicoes < 1) return 'numRefeicoes deve ser ≥ 1'
	// preco pode ser null ("a definir") — só validamos o tipo quando presente
	if (preco !== null && preco !== undefined && (typeof preco !== 'number' || preco < 0)) {
		return 'preco deve ser ≥ 0 ou null (a definir)'
	}
	if (precoUnidade !== undefined && !VALID_PRECO_UNIDADES.includes(precoUnidade as PrecoUnidade)) {
		return `precoUnidade deve ser uma de: ${VALID_PRECO_UNIDADES.join(', ')}`
	}
	if (typeof validadeDias !== 'number' || validadeDias < 1) return 'validadeDias deve ser ≥ 1'
	return null
}

/**
 * POST /api/planos         (admin)
 */
router.post('/', requireAdmin, async (req, res, next) => {
	try {
		const erro = validarCorpo(req.body)
		if (erro) return res.status(400).json({ error: erro })

		const { nome, categoria, duracao, numRefeicoes, preco, precoUnidade, validadeDias, descricao, ativo } = req.body
		// premium é derivado da categoria — categorias premium concedem sempre o tier (Fase 3).
		const premium = categoria !== 'classico'
		const plano = await Plano.create({
			nome: nome.trim(),
			categoria,
			duracao,
			numRefeicoes,
			preco: preco === undefined ? null : preco,
			precoUnidade: precoUnidade ?? 'total',
			validadeDias,
			premium,
			descricao: typeof descricao === 'string' ? descricao.trim() : '',
			ativo: ativo !== false,
		})
		res.status(201).json(plano)
	} catch (err) {
		next(err)
	}
})

/**
 * PUT /api/planos/:id      (admin)
 */
router.put('/:id', requireAdmin, async (req, res, next) => {
	try {
		const erro = validarCorpo(req.body)
		if (erro) return res.status(400).json({ error: erro })

		const { nome, categoria, duracao, numRefeicoes, preco, precoUnidade, validadeDias, descricao, ativo } = req.body
		const premium = categoria !== 'classico'
		const plano = await Plano.findByIdAndUpdate(
			req.params['id'],
			{
				nome: nome.trim(),
				categoria,
				duracao,
				numRefeicoes,
				preco: preco === undefined ? null : preco,
				precoUnidade: precoUnidade ?? 'total',
				validadeDias,
				premium,
				descricao: typeof descricao === 'string' ? descricao.trim() : '',
				...(typeof ativo === 'boolean' ? { ativo } : {}),
			},
			{ returnDocument: 'after', runValidators: true }
		)
		if (!plano) return res.status(404).json({ error: 'Plano não encontrado' })
		res.json(plano)
	} catch (err) {
		next(err)
	}
})

/**
 * DELETE /api/planos/:id   (admin)
 * Soft-delete: marca `ativo: false` para não afetar subscrições históricas.
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
	try {
		const plano = await Plano.findByIdAndUpdate(
			req.params['id'],
			{ ativo: false },
			{ returnDocument: 'after' }
		)
		if (!plano) return res.status(404).json({ error: 'Plano não encontrado' })
		res.json({ ok: true, plano })
	} catch (err) {
		next(err)
	}
})

export default router
