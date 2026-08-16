import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Configuração da escada de recompensas do sistema de streak (singleton).
 * Editável pelo admin. Cada escalão (`tier`) é atingido a um número de dias
 * consecutivos de pedidos (dias úteis, 2ª–sáb).
 *
 * - `tipo: 'desconto'` → `valor` é a percentagem de desconto aplicada ao total
 *   do pedido. Os descontos são **cumulativos**: aplica-se o maior escalão cujo
 *   `dias` seja ≤ streak atual.
 * - `tipo: 'item_gratis'` → recompensa física (dose de batata, prato grátis…),
 *   concedida uma vez ao atingir exatamente o marco. `descricao` descreve o prémio.
 */

export type StreakTierTipo = 'desconto' | 'item_gratis'

export interface IStreakTier {
	dias: number
	tipo: StreakTierTipo
	valor: number
	descricao: string
}

export interface IStreakConfig extends Document {
	tiers: IStreakTier[]
	updatedAt: Date
}

export const DEFAULT_STREAK_TIERS: IStreakTier[] = [
	{ dias: 3, tipo: 'desconto', valor: 8, descricao: '8% de desconto' },
	{ dias: 7, tipo: 'desconto', valor: 11, descricao: '11% de desconto' },
	{ dias: 12, tipo: 'desconto', valor: 20, descricao: '20% de desconto' },
	{ dias: 16, tipo: 'desconto', valor: 28, descricao: '28% de desconto' },
	{ dias: 21, tipo: 'item_gratis', valor: 0, descricao: 'Uma dose de batata grátis' },
	{ dias: 26, tipo: 'item_gratis', valor: 0, descricao: 'Um prato grátis' },
	{ dias: 30, tipo: 'desconto', valor: 40, descricao: '40% de desconto' },
	{ dias: 35, tipo: 'item_gratis', valor: 0, descricao: '2 pratos grátis (no mês)' },
]

const StreakTierSchema = new Schema<IStreakTier>(
	{
		dias: { type: Number, required: true, min: 1 },
		tipo: { type: String, enum: ['desconto', 'item_gratis'], required: true },
		valor: { type: Number, required: true, min: 0, default: 0 },
		descricao: { type: String, required: true, trim: true },
	},
	{ _id: false }
)

const StreakConfigSchema = new Schema<IStreakConfig>(
	{
		tiers: { type: [StreakTierSchema], default: () => DEFAULT_STREAK_TIERS },
	},
	{ timestamps: { createdAt: false, updatedAt: true } }
)

const StreakConfig: Model<IStreakConfig> = mongoose.model<IStreakConfig>('StreakConfig', StreakConfigSchema)

export default StreakConfig
