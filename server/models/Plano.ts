import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Plano pré-pago (Fase 2). Configurável pelo admin.
 *
 * Um plano define um pacote de refeições (`numRefeicoes`) que o cliente compra
 * adiantado por um preço fixo. Ao ser ativado (após confirmação manual do
 * pagamento pelo admin), gera uma `Subscricao` com o saldo de refeições e uma
 * janela de validade (`validadeDias`).
 *
 * `tipo` é apenas uma etiqueta de conveniência para os presets habituais
 * (semanal = 5 refeições / 5 dias úteis, etc.). O que conta para o saldo e a
 * validade são `numRefeicoes` e `validadeDias`.
 */

export type PlanoTipo = 'semanal' | 'bissemanal' | 'mensal'

export interface IPlano extends Document {
	nome: string
	tipo: PlanoTipo
	/** Nº de refeições creditadas ao ativar. */
	numRefeicoes: number
	/** Preço total do pacote (MZN). */
	preco: number
	/** Dias de validade a contar da ativação. */
	validadeDias: number
	/**
	 * Plano premium (Fase 3): uma subscrição ativa deste plano concede ao cliente
	 * o tier premium, que desbloqueia pratos exclusivos no menu do dia.
	 */
	premium: boolean
	descricao: string
	ativo: boolean
	createdAt: Date
	updatedAt: Date
}

const PlanoSchema = new Schema<IPlano>(
	{
		nome: { type: String, required: true, trim: true },
		tipo: { type: String, enum: ['semanal', 'bissemanal', 'mensal'], required: true },
		numRefeicoes: { type: Number, required: true, min: 1 },
		preco: { type: Number, required: true, min: 0 },
		validadeDias: { type: Number, required: true, min: 1 },
		premium: { type: Boolean, default: false },
		descricao: { type: String, trim: true, default: '' },
		ativo: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

const Plano: Model<IPlano> = mongoose.model<IPlano>('Plano', PlanoSchema)

export default Plano
