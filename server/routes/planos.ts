import { Router } from 'express'
import Plano, { type PlanoTipo } from '../models/Plano'

const router = Router()

const VALID_TIPOS: PlanoTipo[] = ['semanal', 'bissemanal', 'mensal']

/**
 * GET /api/planos          (público)
 * Lista de planos. Por omissão apenas os ativos (o client mostra estes);
 * `?todos=1` devolve também os inativos (para o admin).
 */
router.get('/', async (req, res, next) => {
	try {
		const filter = req.query['todos'] === '1' ? {} : { ativo: true }
		const planos = await Plano.find(filter).sort({ preco: 1 })
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
	const { nome, tipo, numRefeicoes, preco, validadeDias } = body
	if (!nome || typeof nome !== 'string' || !nome.trim()) return 'Nome é obrigatório'
	if (typeof tipo !== 'string' || !VALID_TIPOS.includes(tipo as PlanoTipo)) {
		return `tipo deve ser um de: ${VALID_TIPOS.join(', ')}`
	}
	if (typeof numRefeicoes !== 'number' || numRefeicoes < 1) return 'numRefeicoes deve ser ≥ 1'
	if (typeof preco !== 'number' || preco < 0) return 'preco deve ser ≥ 0'
	if (typeof validadeDias !== 'number' || validadeDias < 1) return 'validadeDias deve ser ≥ 1'
	return null
}

/**
 * POST /api/planos         (admin)
 */
router.post('/', async (req, res, next) => {
	try {
		const erro = validarCorpo(req.body)
		if (erro) return res.status(400).json({ error: erro })

		const { nome, tipo, numRefeicoes, preco, validadeDias, descricao, ativo, premium } = req.body
		const plano = await Plano.create({
			nome: nome.trim(),
			tipo,
			numRefeicoes,
			preco,
			validadeDias,
			premium: premium === true,
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
router.put('/:id', async (req, res, next) => {
	try {
		const erro = validarCorpo(req.body)
		if (erro) return res.status(400).json({ error: erro })

		const { nome, tipo, numRefeicoes, preco, validadeDias, descricao, ativo, premium } = req.body
		const plano = await Plano.findByIdAndUpdate(
			req.params['id'],
			{
				nome: nome.trim(),
				tipo,
				numRefeicoes,
				preco,
				validadeDias,
				premium: premium === true,
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
router.delete('/:id', async (req, res, next) => {
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
