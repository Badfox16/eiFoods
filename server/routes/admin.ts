import { Router } from 'express'
import AdminUser from '../models/AdminUser'
import {
	assinarSessaoAdmin,
	definirCookieSessaoAdmin,
	limparCookieSessaoAdmin,
	requireAdmin,
	verificarPassword,
} from '../lib/adminAuth'

const router = Router()

/**
 * Autenticação do painel de administração (Fase 6).
 * Login por username + password; sessão num cookie httpOnly (JWT de admin).
 */

function serializarAdmin(admin: { _id: unknown; username: string; nome?: string }) {
	return {
		_id: String(admin._id),
		username: admin.username,
		nome: admin.nome ?? '',
	}
}

// POST /api/admin/login  { username, password }
router.post('/login', async (req, res, next) => {
	try {
		const { username, password } = req.body as { username?: string; password?: string }
		if (!username?.trim() || !password) {
			return res.status(400).json({ error: 'Utilizador e password são obrigatórios' })
		}

		const admin = await AdminUser.findOne({ username: username.trim().toLowerCase() })
		// Mensagem genérica para não revelar se o utilizador existe.
		const credenciaisInvalidas = () => res.status(401).json({ error: 'Credenciais inválidas' })
		if (!admin) return credenciaisInvalidas()

		const ok = await verificarPassword(password, admin.passwordHash)
		if (!ok) return credenciaisInvalidas()

		const token = assinarSessaoAdmin(admin)
		definirCookieSessaoAdmin(res, token)
		res.json({ ok: true, admin: serializarAdmin(admin) })
	} catch (err) {
		next(err)
	}
})

// POST /api/admin/logout
router.post('/logout', (_req, res) => {
	limparCookieSessaoAdmin(res)
	res.json({ ok: true })
})

// GET /api/admin/me  → admin da sessão
router.get('/me', requireAdmin, (req, res) => {
	res.json({ admin: serializarAdmin(req.admin!) })
})

export default router
