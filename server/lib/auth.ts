import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import Cliente, { type ICliente } from '../models/Cliente'

/**
 * Sessão de cliente via JWT em cookie httpOnly.
 * Helpers de assinatura/verificação + middleware `requireAuth`.
 */

const COOKIE_NAME = 'eifoods_session'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 dias

interface SessionPayload {
	sub: string // clienteId
	telefone: string
}

function getSecret(): string {
	const secret = process.env['JWT_SECRET']
	if (!secret) throw new Error('JWT_SECRET não definida no .env')
	return secret
}

export function assinarSessao(cliente: ICliente): string {
	const payload: SessionPayload = {
		sub: String(cliente._id),
		telefone: cliente.telefone,
	}
	return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS })
}

const isProd = (process.env['NODE_ENV'] ?? 'development') === 'production'

/** Define o cookie httpOnly com o token de sessão. */
export function definirCookieSessao(res: Response, token: string): void {
	res.cookie(COOKIE_NAME, token, {
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? 'none' : 'lax',
		maxAge: TOKEN_TTL_SECONDS * 1000,
		path: '/',
	})
}

/** Limpa o cookie de sessão. */
export function limparCookieSessao(res: Response): void {
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

	// Fallback: Authorization: Bearer <token>
	const auth = req.headers.authorization
	if (auth?.startsWith('Bearer ')) return auth.slice(7)

	return null
}

/**
 * Verifica o token e devolve o payload, ou `null` se inválido/ausente.
 */
export function lerSessao(req: Request): SessionPayload | null {
	const token = extrairToken(req)
	if (!token) return null
	try {
		return jwt.verify(token, getSecret()) as SessionPayload
	} catch {
		return null
	}
}

/**
 * Middleware: exige sessão válida e injeta `req.cliente`.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
	const payload = lerSessao(req)
	if (!payload) {
		res.status(401).json({ error: 'Não autenticado' })
		return
	}

	try {
		const cliente = await Cliente.findById(payload.sub)
		if (!cliente) {
			res.status(401).json({ error: 'Sessão inválida' })
			return
		}
		req.cliente = cliente
		next()
	} catch (err) {
		next(err)
	}
}

// Aumenta o tipo Request do Express para incluir o cliente autenticado.
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			cliente?: ICliente
		}
	}
}
