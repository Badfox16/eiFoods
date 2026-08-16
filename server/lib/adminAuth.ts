import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import AdminUser, { type IAdminUser } from '../models/AdminUser'

/**
 * Sessão de administrador via JWT em cookie httpOnly, separada da sessão de
 * cliente (`lib/auth.ts`). Um cookie e um segredo distintos garantem que um
 * token de cliente nunca é aceite como admin e vice-versa.
 *
 * Password: hash bcrypt via `Bun.password` (nativo do runtime, sem dependência
 * externa). Ver `hashPassword`/`verificarPassword`.
 */

const COOKIE_NAME = 'eifoods_admin'
const TOKEN_TTL_SECONDS = 60 * 60 * 12 // 12 horas

interface AdminSessionPayload {
	sub: string // adminUserId
	username: string
	/** Marca o token como sendo de admin (defesa em profundidade). */
	role: 'admin'
}

function getSecret(): string {
	// Segredo dedicado ao admin; cai no JWT_SECRET geral se não estiver definido.
	const secret = process.env['ADMIN_JWT_SECRET'] ?? process.env['JWT_SECRET']
	if (!secret) throw new Error('ADMIN_JWT_SECRET/JWT_SECRET não definida no .env')
	return secret
}

const isProd = (process.env['NODE_ENV'] ?? 'development') === 'production'

/** Gera o hash bcrypt de uma password. */
export function hashPassword(password: string): Promise<string> {
	return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 10 })
}

/** Verifica uma password contra o seu hash. */
export function verificarPassword(password: string, hash: string): Promise<boolean> {
	return Bun.password.verify(password, hash)
}

export function assinarSessaoAdmin(admin: IAdminUser): string {
	const payload: AdminSessionPayload = {
		sub: String(admin._id),
		username: admin.username,
		role: 'admin',
	}
	return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS })
}

export function definirCookieSessaoAdmin(res: Response, token: string): void {
	res.cookie(COOKIE_NAME, token, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'none' : 'lax',
		maxAge: TOKEN_TTL_SECONDS * 1000,
		path: '/',
	})
}

export function limparCookieSessaoAdmin(res: Response): void {
	res.clearCookie(COOKIE_NAME, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'none' : 'lax',
		path: '/',
	})
}

function extrairToken(req: Request): string | null {
	const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME]
	if (fromCookie) return fromCookie

	const auth = req.headers.authorization
	if (auth?.startsWith('Bearer ')) return auth.slice(7)

	return null
}

/** Verifica o token de admin e devolve o payload, ou `null` se inválido/ausente. */
export function lerSessaoAdmin(req: Request): AdminSessionPayload | null {
	const token = extrairToken(req)
	if (!token) return null
	try {
		const payload = jwt.verify(token, getSecret()) as AdminSessionPayload
		if (payload.role !== 'admin') return null
		return payload
	} catch {
		return null
	}
}

/** Middleware: exige sessão de admin válida e injeta `req.admin`. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
	const payload = lerSessaoAdmin(req)
	if (!payload) {
		res.status(401).json({ error: 'Não autenticado (admin)' })
		return
	}

	try {
		const admin = await AdminUser.findById(payload.sub)
		if (!admin) {
			res.status(401).json({ error: 'Sessão de admin inválida' })
			return
		}
		req.admin = admin
		next()
	} catch (err) {
		next(err)
	}
}

// Aumenta o tipo Request do Express para incluir o admin autenticado.
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			admin?: IAdminUser
		}
	}
}
