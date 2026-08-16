/**
 * Cálculo puro dos totais de um pedido (Fase 6 — extraído de routes/orders.ts
 * para ser testável em isolamento). Combina o consumo de plano pré-pago com o
 * desconto de streak, sem tocar na base de dados.
 *
 * Regras (decisões de produto já em vigor):
 *  - Plano pré-pago: cada prato base abate 1 refeição do saldo. Cobrem-se
 *    primeiro os pratos mais caros (mais valor para o cliente). Extras e taxa
 *    fora-do-dia continuam cobrados em dinheiro.
 *  - Desconto de streak: aplica-se apenas ao valor **ainda cobrado** (após o
 *    plano), arredondado ao inteiro.
 */

export interface ItemParaCalculo {
	/** Preço do prato base (a parte coberta por 1 refeição do plano). */
	pratoPreco: number
	/** Total bruto do item = pratoPreco + extras + taxa fora-do-dia. */
	total: number
}

export interface TotaisPedido {
	subtotal: number
	/** Refeições do plano efetivamente consumidas (≤ saldo, ≤ nº de itens). */
	refeicoesConsumidas: number
	/** Soma dos preços base cobertos pelo plano. */
	valorPlanoCoberto: number
	/** Base a cobrar em dinheiro após abater o que o plano cobriu. */
	baseAposPlano: number
	descontoStreakPercent: number
	descontoStreakValor: number
	total: number
	/** Índices (no array original) dos itens pagos com o plano. */
	itensPagosComPlano: number[]
}

/**
 * Calcula os totais de um pedido. Função pura e determinística.
 *
 * @param itens                itens do pedido (preço base + total bruto)
 * @param refeicoesRestantes   saldo de refeições da subscrição ativa (0 se nenhuma)
 * @param descontoStreakPercent desconto de streak em % (0–100)
 */
export function calcularTotaisPedido(
	itens: ItemParaCalculo[],
	refeicoesRestantes = 0,
	descontoStreakPercent = 0
): TotaisPedido {
	const subtotal = itens.reduce((sum, i) => sum + i.total, 0)

	// Cobre primeiro os pratos mais caros (ordena índices por preço base desc).
	const idxPorPreco = itens
		.map((_, i) => i)
		.sort((a, b) => itens[b]!.pratoPreco - itens[a]!.pratoPreco)

	const itensPagosComPlano: number[] = []
	let valorPlanoCoberto = 0
	let refeicoesConsumidas = 0
	for (const i of idxPorPreco) {
		if (refeicoesConsumidas >= refeicoesRestantes) break
		itensPagosComPlano.push(i)
		valorPlanoCoberto += itens[i]!.pratoPreco
		refeicoesConsumidas += 1
	}

	const baseAposPlano = Math.max(0, subtotal - valorPlanoCoberto)
	const pct = Math.max(0, descontoStreakPercent)
	const descontoStreakValor = Math.round((baseAposPlano * pct) / 100)
	const total = Math.max(0, baseAposPlano - descontoStreakValor)

	return {
		subtotal,
		refeicoesConsumidas,
		valorPlanoCoberto,
		baseAposPlano,
		descontoStreakPercent: pct,
		descontoStreakValor,
		total,
		itensPagosComPlano,
	}
}
