import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

/**
 * Subscrição de um plano pré-pago por um cliente (Fase 2).
 *
 * Ciclo de vida (`estado`):
 *   `pendente_pagamento` → cliente comprou e enviou comprovativo; aguarda admin.
 *   `ativa`             → admin confirmou o pagamento; refeições creditadas.
 *   `expirada`          → validade ultrapassada **ou** saldo esgotado.
 *   `rejeitada`         → admin recusou o comprovativo.
 *
 * O pagamento é manual (M-Pesa/e-Mola/transferência): o cliente envia um
 * comprovativo (imagem no Cloudinary) e o admin confirma. Ao confirmar,
 * `refeicoesRestantes` é creditado a partir do snapshot do plano e a janela de
 * validade (`dataInicio`/`dataExpiracao`) é definida.
 *
 * Guardamos snapshots (`planoNome`, `numRefeicoes`, `preco`) para que alterações
 * futuras ao `Plano` não reescrevam subscrições já emitidas.
 */

export type SubscricaoEstado = 'pendente_pagamento' | 'ativa' | 'expirada' | 'rejeitada'

export interface IComprovativo {
	url: string
	publicId: string
}

export interface ISubscricao extends Document {
	clienteId: Types.ObjectId
	planoId: Types.ObjectId
	/** Snapshot do plano no momento da compra (imune a edições posteriores). */
	planoNome: string
	numRefeicoes: number
	preco: number
	/** Snapshot: era um plano premium? (concede tier premium enquanto ativa — Fase 3) */
	premium: boolean
	/** Refeições ainda disponíveis para consumo. */
	refeicoesRestantes: number
	estado: SubscricaoEstado
	/** Comprovativo de pagamento enviado pelo cliente. */
	comprovativo?: IComprovativo
	/** Preenchido ao ativar. */
	dataInicio?: Date
	/** Preenchido ao ativar (dataInicio + plano.validadeDias). */
	dataExpiracao?: Date
	/** Nota opcional do admin (motivo de rejeição, etc.). */
	notaAdmin?: string
	createdAt: Date
	updatedAt: Date
}

const ComprovativoSchema = new Schema<IComprovativo>(
	{
		url: { type: String, required: true },
		publicId: { type: String, required: true },
	},
	{ _id: false }
)

const SubscricaoSchema = new Schema<ISubscricao>(
	{
		clienteId: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true, index: true },
		planoId: { type: Schema.Types.ObjectId, ref: 'Plano', required: true },
		planoNome: { type: String, required: true, trim: true },
		numRefeicoes: { type: Number, required: true, min: 1 },
		preco: { type: Number, required: true, min: 0 },
		premium: { type: Boolean, default: false },
		refeicoesRestantes: { type: Number, required: true, min: 0, default: 0 },
		estado: {
			type: String,
			enum: ['pendente_pagamento', 'ativa', 'expirada', 'rejeitada'],
			default: 'pendente_pagamento',
			index: true,
		},
		comprovativo: { type: ComprovativoSchema },
		dataInicio: { type: Date },
		dataExpiracao: { type: Date },
		notaAdmin: { type: String, trim: true },
	},
	{ timestamps: true }
)

const Subscricao: Model<ISubscricao> = mongoose.model<ISubscricao>('Subscricao', SubscricaoSchema)

export default Subscricao
