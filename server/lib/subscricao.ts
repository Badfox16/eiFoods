import Subscricao, { type ISubscricao } from '../models/Subscricao'
import type { TipoPlano } from '../models/Plano'
import type { Types } from 'mongoose'

/**
 * Lógica de consumo de subscrições pré-pagas (Fase 2).
 *
 * Regra de consumo (decisão de produto): **1 prato base = 1 refeição**. Cada
 * prato de um pedido abate 1 refeição do saldo; extras e taxa fora-do-dia
 * continuam a ser cobrados em dinheiro. Um pedido de 2 pratos consome 2
 * refeições (se houver saldo).
 */

/**
 * Marca como `expirada` uma subscrição ativa cuja validade já passou.
 * Persiste a alteração. Devolve a subscrição (possivelmente atualizada).
 */
export async function reconciliarValidade(sub: ISubscricao, agora = new Date()): Promise<ISubscricao> {
	if (sub.estado === 'ativa' && sub.dataExpiracao && sub.dataExpiracao.getTime() <= agora.getTime()) {
		sub.estado = 'expirada'
		await sub.save()
	}
	return sub
}

/**
 * Subscrição ativa e com saldo do cliente, ou `null`.
 * Reconciliar validade antes de devolver (uma subscrição fora de validade é
 * marcada `expirada` e ignorada). Em caso de várias, usa a que expira primeiro
 * (consome as mais próximas da validade).
 */
export async function getSubscricaoAtiva(
	clienteId: string | Types.ObjectId,
	agora = new Date()
): Promise<ISubscricao | null> {
	const candidatas = await Subscricao.find({ clienteId, estado: 'ativa', refeicoesRestantes: { $gt: 0 } }).sort({
		dataExpiracao: 1,
	})

	for (const sub of candidatas) {
		await reconciliarValidade(sub, agora)
		if (sub.estado === 'ativa' && sub.refeicoesRestantes > 0) return sub
	}
	return null
}

/**
 * Tier premium (Fase 3): o cliente é premium enquanto tiver uma subscrição
 * premium **ativa** (estado `ativa`, dentro da validade). O tier desbloqueia os
 * pratos marcados como `exclusivo` no menu do dia.
 *
 * Nota: como esgotar o saldo passa a subscrição a `expirada`, o tier premium
 * está atualmente ligado a ter refeições disponíveis. Um plano premium sem
 * refeições restantes deixa de conceder o tier (comportamento aceite na v1).
 */
export async function isClientePremium(
	clienteId: string | Types.ObjectId,
	agora = new Date()
): Promise<boolean> {
	const candidatas = await Subscricao.find({ clienteId, estado: 'ativa', premium: true })
	for (const sub of candidatas) {
		await reconciliarValidade(sub, agora)
		if (sub.estado === 'ativa') return true
	}
	return false
}

/**
 * Categoria de plano ativa do cliente (Fase 7), ou `null` se não tiver
 * subscrição ativa com saldo, ou se a que tiver for `classico`.
 *
 * Determina qual `PlanoMenu` o cliente vê no ecrã de Menu (Menu.jsx) e é
 * reforçado no servidor em `POST /orders` — um cliente com uma categoria
 * premium ativa só pode encomendar pratos desse `PlanoMenu`.
 */
export async function getCategoriaAtiva(
	clienteId: string | Types.ObjectId,
	agora = new Date()
): Promise<TipoPlano | null> {
	const sub = await getSubscricaoAtiva(clienteId, agora)
	if (sub && sub.categoria !== 'classico') return sub.categoria
	return null
}

/**
 * Abate `quantidade` refeições da subscrição e persiste. Se o saldo chegar a 0,
 * a subscrição passa a `expirada` (esgotada). Devolve quantas foram efetivamente
 * consumidas (limitado pelo saldo).
 */
export async function consumirRefeicoes(sub: ISubscricao, quantidade: number): Promise<number> {
	const consumidas = Math.max(0, Math.min(quantidade, sub.refeicoesRestantes))
	if (consumidas === 0) return 0

	sub.refeicoesRestantes -= consumidas
	if (sub.refeicoesRestantes === 0) sub.estado = 'expirada'
	await sub.save()
	return consumidas
}
