import type { ICliente } from '../models/Cliente'
import StreakConfig, { type IStreakConfig, type IStreakTier } from '../models/StreakConfig'
import { getCurrentDateKeyMaputo, getPreviousBusinessDayKey } from './businessTime'

/**
 * Lógica do sistema de streak/sequência (estilo Duolingo).
 * Um "dia contado" é um dia útil (2ª–sáb) em que o cliente fez pelo menos um pedido.
 */

export type StreakTransition = 'same' | 'consecutive' | 'broken'

/** Getter do singleton de configuração da escada de recompensas. */
export async function getStreakConfig(): Promise<IStreakConfig> {
	let doc = await StreakConfig.findOne()
	if (!doc) doc = await StreakConfig.create({})
	return doc
}

/**
 * Classifica a relação entre o último dia contado e hoje:
 * - `same`        → já contou hoje (idempotente, não altera streak)
 * - `consecutive` → o último dia foi o dia útil anterior (incrementa)
 * - `broken`      → falhou ≥1 dia útil, ou é o primeiro pedido (reinicia a 1)
 */
export function classifyStreak(ultimoDiaPedido: string | undefined, hoje = getCurrentDateKeyMaputo()): StreakTransition {
	if (!ultimoDiaPedido) return 'broken'
	if (ultimoDiaPedido === hoje) return 'same'
	if (ultimoDiaPedido === getPreviousBusinessDayKey()) return 'consecutive'
	return 'broken'
}

/** Desconto (%) aplicável a um dado streak: maior escalão de desconto com `dias ≤ streak`. */
export function descontoParaStreak(streak: number, tiers: IStreakTier[]): number {
	const valores = tiers
		.filter((t) => t.tipo === 'desconto' && t.dias <= streak)
		.map((t) => t.valor)
	return valores.length ? Math.max(...valores) : 0
}

/** Próximo escalão ainda não atingido (para mostrar "próxima recompensa"). */
export function proximoTier(streak: number, tiers: IStreakTier[]): IStreakTier | null {
	const futuros = [...tiers].filter((t) => t.dias > streak).sort((a, b) => a.dias - b.dias)
	return futuros[0] ?? null
}

export interface StreakUpdateResult {
	streakAtual: number
	maiorStreak: number
	descontoPercent: number
	/** Recompensas de item ganhas neste pedido (marco atingido agora). */
	novasRecompensas: { dias: number; descricao: string }[]
	/** Transição aplicada (útil para telemetria/UI). */
	transicao: StreakTransition
}

/**
 * Regista um pedido no streak do cliente. Idempotente por dia: múltiplos pedidos
 * no mesmo dia não incrementam duas vezes. **Muta e grava** o documento `cliente`.
 * Devolve o estado resultante e o desconto aplicável ao pedido atual.
 */
export async function registrarPedidoStreak(cliente: ICliente): Promise<StreakUpdateResult> {
	const config = await getStreakConfig()
	const hoje = getCurrentDateKeyMaputo()
	const transicao = classifyStreak(cliente.ultimoDiaPedido, hoje)
	const novasRecompensas: { dias: number; descricao: string }[] = []

	if (transicao !== 'same') {
		cliente.streakAtual = transicao === 'consecutive' ? (cliente.streakAtual ?? 0) + 1 : 1
		cliente.ultimoDiaPedido = hoje
		if (cliente.streakAtual > (cliente.maiorStreak ?? 0)) {
			cliente.maiorStreak = cliente.streakAtual
		}

		// Conceder recompensas de item ao atingir exatamente o marco.
		for (const tier of config.tiers) {
			if (tier.tipo === 'item_gratis' && tier.dias === cliente.streakAtual) {
				cliente.recompensasGanhas.push({
					dias: tier.dias,
					descricao: tier.descricao,
					ganhoEm: new Date(),
					cumprida: false,
				})
				novasRecompensas.push({ dias: tier.dias, descricao: tier.descricao })
			}
		}

		await cliente.save()
	}

	return {
		streakAtual: cliente.streakAtual,
		maiorStreak: cliente.maiorStreak,
		descontoPercent: descontoParaStreak(cliente.streakAtual, config.tiers),
		novasRecompensas,
		transicao,
	}
}
