import { Router } from 'express'
import Cliente from '../models/Cliente'
import { normalizarTelefone, requestOtp, verifyOtp } from '../lib/otp'
import {
	assinarSessao,
	definirCookieSessao,
	limparCookieSessao,
	requireAuth,
} from '../lib/auth'

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

// GET /api/auth/me  → cliente da sessão
router.get('/me', requireAuth, (req, res) => {
	res.json({ cliente: serializarCliente(req.cliente!) })
})

export default router
