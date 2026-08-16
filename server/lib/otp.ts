import { randomInt } from 'node:crypto'
import OtpCode from '../models/OtpCode'

/**
 * Geração, armazenamento e envio de códigos OTP.
 *
 * Armazenamento: coleção `OtpCode` no Mongo com TTL index (sobrevive a
 * restart do servidor e é limpo automaticamente ao expirar).
 *
 * Envio: abstraído via `enviarOtp`. Em desenvolvimento apenas loga o código
 * no console — a integração real com WhatsApp/SMS fica para uma fase futura.
 */

/** Duração de validade do código (5 minutos). */
const OTP_TTL_MS = 5 * 60 * 1000
/** Janela mínima entre pedidos de OTP para o mesmo telefone (rate-limit). */
const OTP_REQUEST_COOLDOWN_MS = 60 * 1000
/** Nº máximo de tentativas de verificação por código antes de invalidar. */
const OTP_MAX_TENTATIVAS = 5

const isDev = (process.env['NODE_ENV'] ?? 'development') === 'development'

/**
 * Normaliza um telefone moçambicano para o formato canónico 258XXXXXXXXX.
 * Aceita entradas como "841234567", "+258 84 123 4567", "258841234567".
 * Devolve `null` se não for possível normalizar para 9 dígitos locais.
 */
export function normalizarTelefone(input: string): string | null {
	if (!input) return null
	let digits = input.replace(/\D/g, '')

	// Remover prefixo internacional se presente
	if (digits.startsWith('258')) digits = digits.slice(3)
	// Remover eventual zero à cabeça (formato local antigo)
	if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1)

	// Número local moçambicano de telemóvel: 9 dígitos a começar por 8
	if (!/^8\d{8}$/.test(digits)) return null

	return `258${digits}`
}

/** Gera um código OTP de 6 dígitos (com zeros à esquerda). Usa CSPRNG. */
export function gerarCodigo(): string {
	return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export interface RequestOtpResult {
	ok: boolean
	/** Segundos a aguardar antes de novo pedido (quando ok=false por rate-limit). */
	retryAfter?: number
	error?: string
}

/**
 * Gera (ou substitui) o código OTP para um telefone e envia-o.
 * Aplica rate-limit básico por telefone.
 */
export async function requestOtp(telefone: string): Promise<RequestOtpResult> {
	const existente = await OtpCode.findOne({ telefone }).sort({ createdAt: -1 })

	if (existente) {
		const idadeMs = Date.now() - existente.createdAt.getTime()
		if (idadeMs < OTP_REQUEST_COOLDOWN_MS) {
			const retryAfter = Math.ceil((OTP_REQUEST_COOLDOWN_MS - idadeMs) / 1000)
			return { ok: false, retryAfter, error: 'Aguarde antes de pedir um novo código' }
		}
	}

	const codigo = gerarCodigo()
	const expiraEm = new Date(Date.now() + OTP_TTL_MS)

	// Substitui qualquer código anterior deste telefone (1 código ativo de cada vez).
	await OtpCode.deleteMany({ telefone })
	await OtpCode.create({ telefone, codigo, tentativas: 0, expiraEm })

	await enviarOtp(telefone, codigo)
	return { ok: true }
}

export interface VerifyOtpResult {
	ok: boolean
	error?: string
}

/**
 * Valida o código para um telefone. Consome o código em caso de sucesso.
 * Conta tentativas falhadas e invalida o código ao exceder o limite.
 */
export async function verifyOtp(telefone: string, codigo: string): Promise<VerifyOtpResult> {
	const registo = await OtpCode.findOne({ telefone }).sort({ createdAt: -1 })

	if (!registo) return { ok: false, error: 'Código expirado ou inexistente. Peça um novo.' }

	if (registo.expiraEm.getTime() < Date.now()) {
		await OtpCode.deleteMany({ telefone })
		return { ok: false, error: 'Código expirado. Peça um novo.' }
	}

	if (registo.tentativas >= OTP_MAX_TENTATIVAS) {
		await OtpCode.deleteMany({ telefone })
		return { ok: false, error: 'Demasiadas tentativas. Peça um novo código.' }
	}

	if (registo.codigo !== String(codigo).trim()) {
		registo.tentativas += 1
		await registo.save()
		return { ok: false, error: 'Código incorreto' }
	}

	// Sucesso — consome o código.
	await OtpCode.deleteMany({ telefone })
	return { ok: true }
}

/**
 * Abstração do provider de envio de OTP.
 * Em dev, apenas loga no console. Substituir por WhatsApp/SMS real numa
 * fase futura (ex.: Twilio, Meta WhatsApp Cloud API).
 */
export async function enviarOtp(telefone: string, codigo: string): Promise<void> {
	if (isDev) {
		console.log(`[OTP] Código para ${telefone}: ${codigo} (válido por 5 min)`)
		return
	}

	// TODO: integrar provider real (WhatsApp/SMS). Por agora, mesmo em produção
	// registamos que o envio não está configurado para não bloquear o fluxo.
	console.warn(`[OTP] Provider de envio não configurado — código para ${telefone} não enviado.`)
}
