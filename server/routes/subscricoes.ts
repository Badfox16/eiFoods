import { Router } from 'express'
import Subscricao, { type SubscricaoEstado } from '../models/Subscricao'
import Plano from '../models/Plano'
import cloudinary from '../lib/cloudinary'
import upload from '../lib/upload'
import { requireAuth } from '../lib/auth'
import { reconciliarValidade } from '../lib/subscricao'

const router = Router()

const VALID_ESTADOS: SubscricaoEstado[] = ['pendente_pagamento', 'ativa', 'expirada', 'rejeitada']

// Helper: upload buffer para o Cloudinary (pasta dos comprovativos)
async function uploadComprovativo(buffer: Buffer): Promise<{ url: string; publicId: string }> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{ folder: 'eiFoods/comprovativos' },
			(error, result) => {
				if (error || !result) return reject(error ?? new Error('Cloudinary upload falhou'))
				resolve({ url: result.secure_url, publicId: result.public_id })
			}
		)
		stream.end(buffer)
	})
}

/**
 * POST /api/subscricoes    (auth, multipart)
 * Campo `comprovativo` (ficheiro) + `planoId`. Cria a subscrição em estado
 * `pendente_pagamento` — o admin confirma o pagamento manualmente depois.
 */
router.post('/', requireAuth, upload.single('comprovativo'), async (req, res, next) => {
	try {
		const cliente = req.cliente!
		const { planoId } = req.body as { planoId?: string }
		if (!planoId) return res.status(400).json({ error: 'planoId é obrigatório' })

		const plano = await Plano.findById(planoId)
		if (!plano || !plano.ativo) return res.status(404).json({ error: 'Plano indisponível' })

		let comprovativo: { url: string; publicId: string } | undefined
		if (req.file) {
			comprovativo = await uploadComprovativo(req.file.buffer)
		}

		const subscricao = await Subscricao.create({
			clienteId: cliente._id,
			planoId: plano._id,
			planoNome: plano.nome,
			numRefeicoes: plano.numRefeicoes,
			preco: plano.preco,
			refeicoesRestantes: 0,
			estado: 'pendente_pagamento',
			comprovativo,
		})

		res.status(201).json(subscricao)
	} catch (err) {
		next(err)
	}
})

/**
 * GET /api/subscricoes/me  (auth)
 * Subscrições do cliente da sessão (mais recentes primeiro). Reconcilia
 * validade das ativas antes de responder.
 */
router.get('/me', requireAuth, async (req, res, next) => {
	try {
		const cliente = req.cliente!
		const subs = await Subscricao.find({ clienteId: cliente._id }).sort({ createdAt: -1 })
		await Promise.all(subs.map((s) => reconciliarValidade(s)))
		res.json(subs)
	} catch (err) {
		next(err)
	}
})

/**
 * POST /api/subscricoes/:id/comprovativo   (auth, multipart)
 * (Re)envia o comprovativo de uma subscrição pendente do próprio cliente.
 */
router.post('/:id/comprovativo', requireAuth, upload.single('comprovativo'), async (req, res, next) => {
	try {
		const cliente = req.cliente!
		if (!req.file) return res.status(400).json({ error: 'Ficheiro comprovativo em falta' })

		const sub = await Subscricao.findOne({ _id: req.params['id'], clienteId: cliente._id })
		if (!sub) return res.status(404).json({ error: 'Subscrição não encontrada' })
		if (sub.estado !== 'pendente_pagamento') {
			return res.status(409).json({ error: 'Só é possível enviar comprovativo enquanto pendente' })
		}

		// Apaga o comprovativo anterior, se existir
		if (sub.comprovativo?.publicId) {
			await cloudinary.uploader.destroy(sub.comprovativo.publicId).catch(() => {})
		}
		sub.comprovativo = await uploadComprovativo(req.file.buffer)
		await sub.save()
		res.json(sub)
	} catch (err) {
		next(err)
	}
})

// ── Rotas de admin ────────────────────────────────────────────────────────────

/**
 * GET /api/subscricoes     (admin)
 * Query: ?estado=pendente_pagamento|ativa|expirada|rejeitada
 * Popula cliente (telefone/nome) e plano.
 */
router.get('/', async (req, res, next) => {
	try {
		const filter: Record<string, unknown> = {}
		const estado = req.query['estado'] as SubscricaoEstado | undefined
		if (estado && VALID_ESTADOS.includes(estado)) filter['estado'] = estado

		const subs = await Subscricao.find(filter)
			.populate('clienteId', 'telefone nome')
			.populate('planoId', 'nome tipo')
			.sort({ createdAt: -1 })
		res.json(subs)
	} catch (err) {
		next(err)
	}
})

/**
 * PATCH /api/subscricoes/:id/confirmar   (admin)
 * Ativa a subscrição: credita `numRefeicoes` e define a janela de validade a
 * partir de agora (usa `validadeDias` do plano atual, com fallback ao snapshot).
 */
router.patch('/:id/confirmar', async (req, res, next) => {
	try {
		const sub = await Subscricao.findById(req.params['id'])
		if (!sub) return res.status(404).json({ error: 'Subscrição não encontrada' })
		if (sub.estado !== 'pendente_pagamento') {
			return res.status(409).json({ error: 'Só subscrições pendentes podem ser confirmadas' })
		}

		const plano = await Plano.findById(sub.planoId)
		const validadeDias = plano?.validadeDias ?? 30

		const inicio = new Date()
		const expiracao = new Date(inicio.getTime() + validadeDias * 24 * 60 * 60 * 1000)

		sub.estado = 'ativa'
		sub.refeicoesRestantes = sub.numRefeicoes
		sub.dataInicio = inicio
		sub.dataExpiracao = expiracao
		if (typeof req.body?.notaAdmin === 'string') sub.notaAdmin = req.body.notaAdmin.trim()
		await sub.save()

		res.json(sub)
	} catch (err) {
		next(err)
	}
})

/**
 * PATCH /api/subscricoes/:id/rejeitar    (admin)
 * Body opcional: { notaAdmin }
 */
router.patch('/:id/rejeitar', async (req, res, next) => {
	try {
		const sub = await Subscricao.findById(req.params['id'])
		if (!sub) return res.status(404).json({ error: 'Subscrição não encontrada' })
		if (sub.estado !== 'pendente_pagamento') {
			return res.status(409).json({ error: 'Só subscrições pendentes podem ser rejeitadas' })
		}

		sub.estado = 'rejeitada'
		if (typeof req.body?.notaAdmin === 'string') sub.notaAdmin = req.body.notaAdmin.trim()
		await sub.save()
		res.json(sub)
	} catch (err) {
		next(err)
	}
})

export default router
