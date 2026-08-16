import { describe, expect, it } from 'bun:test'
import { calcularTotaisPedido, type ItemParaCalculo } from './pedidoTotais'

/** Item sem extras/taxa: total bruto == preço base. */
function base(pratoPreco: number): ItemParaCalculo {
	return { pratoPreco, total: pratoPreco }
}

describe('calcularTotaisPedido', () => {
	it('sem subscrição e sem desconto: total = subtotal', () => {
		const r = calcularTotaisPedido([base(250), base(300)], 0, 0)
		expect(r.subtotal).toBe(550)
		expect(r.refeicoesConsumidas).toBe(0)
		expect(r.valorPlanoCoberto).toBe(0)
		expect(r.descontoStreakValor).toBe(0)
		expect(r.total).toBe(550)
		expect(r.itensPagosComPlano).toEqual([])
	})

	it('aplica desconto de streak apenas sobre a base (arredondado)', () => {
		const r = calcularTotaisPedido([base(250), base(300)], 0, 8)
		// 8% de 550 = 44
		expect(r.baseAposPlano).toBe(550)
		expect(r.descontoStreakValor).toBe(44)
		expect(r.total).toBe(506)
	})

	it('desconto arredonda ao inteiro mais próximo', () => {
		// 11% de 250 = 27.5 → 28
		const r = calcularTotaisPedido([base(250)], 0, 11)
		expect(r.descontoStreakValor).toBe(28)
		expect(r.total).toBe(222)
	})

	it('plano cobre primeiro o prato mais caro', () => {
		const r = calcularTotaisPedido([base(250), base(300), base(220)], 1, 0)
		expect(r.refeicoesConsumidas).toBe(1)
		expect(r.valorPlanoCoberto).toBe(300)
		expect(r.itensPagosComPlano).toEqual([1]) // índice do prato de 300
		expect(r.total).toBe(470) // 770 - 300
	})

	it('saldo limita o nº de refeições consumidas (os 2 mais caros)', () => {
		const r = calcularTotaisPedido([base(200), base(300), base(250)], 2, 0)
		expect(r.refeicoesConsumidas).toBe(2)
		expect(r.valorPlanoCoberto).toBe(550) // 300 + 250
		expect(new Set(r.itensPagosComPlano)).toEqual(new Set([1, 2]))
		expect(r.total).toBe(200)
	})

	it('saldo superior ao nº de itens: cobre todos os pratos base', () => {
		const r = calcularTotaisPedido([base(200), base(300)], 5, 0)
		expect(r.refeicoesConsumidas).toBe(2)
		expect(r.valorPlanoCoberto).toBe(500)
		expect(r.total).toBe(0)
	})

	it('extras e taxa continuam cobrados: plano só abate o preço base', () => {
		// prato 250 + 50 de extra = total 300; plano cobre os 250 do prato base.
		const r = calcularTotaisPedido([{ pratoPreco: 250, total: 300 }], 1, 0)
		expect(r.valorPlanoCoberto).toBe(250)
		expect(r.baseAposPlano).toBe(50) // 300 - 250 (o extra sobra)
		expect(r.total).toBe(50)
	})

	it('plano + streak: desconto incide sobre o valor após o plano', () => {
		// [300, 200], saldo 1 → cobre 300; base 200; 10% → 20; total 180.
		const r = calcularTotaisPedido([base(300), base(200)], 1, 10)
		expect(r.valorPlanoCoberto).toBe(300)
		expect(r.baseAposPlano).toBe(200)
		expect(r.descontoStreakValor).toBe(20)
		expect(r.total).toBe(180)
	})

	it('total nunca é negativo', () => {
		const r = calcularTotaisPedido([base(100)], 5, 100)
		expect(r.total).toBe(0)
	})

	it('pedido vazio: tudo a zero', () => {
		const r = calcularTotaisPedido([], 3, 20)
		expect(r.subtotal).toBe(0)
		expect(r.total).toBe(0)
		expect(r.refeicoesConsumidas).toBe(0)
	})
})
