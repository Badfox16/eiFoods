import { Router } from 'express'
import Cliente from '../models/Cliente'
import { normalizarTelefone, requestOtp, verifyOtp } from '../lib/otp'
import {
	assinarSessao,
	definirCookieSessao,
	limparCookieSessao,
	requireAuth,
} from '../lib/auth'
import { isClientePremium, getCategoriaAtiva } from '../lib/subscricao'

const router = Router()

/**
 * Autenticação de clientes por telefone + OTP.
 * A sessão vive num cookie httpOnly (JWT).
 */

function serializarCliente(cliente: {
	_id: unknown
	telefone: string
	nome?: string
	empresaId?: unknown
	createdAt?: Date
}) {
	return {
		_id: String(cliente._id),
		telefone: cliente.telefone,
		nome: cliente.nome ?? '',
		empresaId: cliente.empresaId ? String(cliente.empresaId) : null,
		createdAt: cliente.createdAt,
	}
}

// POST /api/auth/request-otp  { telefone }
router.post('/request-otp', async (req, res, next) => {
	try {
		const { telefone } = req.body as { telefone?: string }
		const normalizado = normalizarTelefone(telefone ?? '')
		if (!normalizado) {
			return res.status(400).json({ error: 'Número de telefone inválido' })
		}

		const result = await requestOtp(normalizado)
		if (!result.ok) {
			return res.status(429).json({ error: result.error, retryAfter: result.retryAfter })
		}

		res.json({ ok: true, telefone: normalizado, message: 'Código enviado' })
	} catch (err) {
		next(err)
	}
})

// POST /api/auth/verify-otp  { telefone, codigo }
router.post('/verify-otp', async (req, res, next) => {
	try {
		const { telefone, codigo } = req.body as { telefone?: string; codigo?: string }
		const normalizado = normalizarTelefone(telefone ?? '')
		if (!normalizado) {
			return res.status(400).json({ error: 'Número de telefone inválido' })
		}
		if (!codigo || !/^\d{6}$/.test(String(codigo).trim())) {
			return res.status(400).json({ error: 'Código inválido' })
		}

		const result = await verifyOtp(normalizado, String(codigo).trim())
		if (!result.ok) {
			return res.status(401).json({ error: result.error })
		}

		// Cria o cliente se ainda não existir (login = registo leve).
		let cliente = await Cliente.findOne({ telefone: normalizado })
		let novo = false
		if (!cliente) {
			cliente = await Cliente.create({ telefone: normalizado })
			novo = true
		}

		const token = assinarSessao(cliente)
		definirCookieSessao(res, token)

		res.json({ ok: true, novo, cliente: serializarCliente(cliente) })
	} catch (err) {
		next(err)
	}
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
	limparCookieSessao(res)
	res.json({ ok: true })
})

/** Cliente serializado + tier premium (Fase 3) + categoria ativa (Fase 7). */
async function serializarClienteCompleto(cliente: Parameters<typeof serializarCliente>[0] & { _id: unknown }) {
	const clienteId = String(cliente._id)
	const [premium, categoriaAtiva] = await Promise.all([
		isClientePremium(clienteId),
		getCategoriaAtiva(clienteId),
	])
	return { ...serializarCliente(cliente), premium, categoriaAtiva }
}

// GET /api/auth/me  → cliente da sessão (+ tier premium — Fase 3; categoria ativa — Fase 7)
router.get('/me', requireAuth, async (req, res, next) => {
	try {
		res.json({ cliente: await serializarClienteCompleto(req.cliente!) })
	} catch (err) {
		next(err)
	}
})

// PATCH /api/auth/me  { nome }  → atualiza o perfil do cliente da sessão (Fase 8 — Perfil)
// Por agora só o nome é editável; o telefone é a identidade da conta (exige
// novo OTP para mudar, não suportado ainda).
router.patch('/me', requireAuth, async (req, res, next) => {
	try {
		const { nome } = req.body as { nome?: string }
		if (typeof nome !== 'string' || !nome.trim()) {
			return res.status(400).json({ error: 'Nome é obrigatório' })
		}
		if (nome.trim().length < 2) {
			return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres' })
		}

		const cliente = req.cliente!
		cliente.nome = nome.trim()
		await cliente.save()

		res.json({ cliente: await serializarClienteCompleto(cliente) })
	} catch (err) {
		next(err)
	}
})

export default router
