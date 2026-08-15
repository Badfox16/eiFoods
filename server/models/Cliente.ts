import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

/**
 * Cliente singular — conta leve identificada por telefone (+ OTP).
 * Base para streaks, planos e histórico. As funcionalidades de empresa
 * ficam em standby: `empresaId` é opcional e não é exigido no fluxo atual.
 *
 * Campos de streak (Fase 4): contam dias úteis consecutivos com pedido.
 * Ver lib/streak.ts para a lógica de incremento/reset e cálculo de recompensas.
 */

/** Recompensa de item grátis ganha ao atingir um marco do streak. */
export interface IRecompensaGanha {
	/** Nº de dias do marco (ex.: 21, 26, 35). */
	dias: number
	descricao: string
	ganhoEm: Date
	/** Marcado pelo admin quando o prémio for entregue. */
	cumprida: boolean
}

export interface ICliente extends Document {
	/** Telefone normalizado no formato 258XXXXXXXXX (único). */
	telefone: string
	/** Nome do cliente (opcional; pode ser preenchido no primeiro pedido). */
	nome?: string
	/** Empresa associada (opcional — empresa em standby). */
	empresaId?: Types.ObjectId
	/** Dias úteis consecutivos com pedido. */
	streakAtual: number
	/** Maior streak alguma vez atingido. */
	maiorStreak: number
	/** Chave de dia (AAAA-MM-DD, timezone Maputo) do último pedido contado. */
	ultimoDiaPedido?: string
	/** Recompensas de item grátis ganhas (histórico). */
	recompensasGanhas: IRecompensaGanha[]
	createdAt: Date
	updatedAt: Date
}

const RecompensaGanhaSchema = new Schema<IRecompensaGanha>(
	{
		dias: { type: Number, required: true },
		descricao: { type: String, required: true },
		ganhoEm: { type: Date, default: Date.now },
		cumprida: { type: Boolean, default: false },
	},
	{ _id: true }
)

const ClienteSchema = new Schema<ICliente>(
	{
		telefone: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			// Esperamos o número já normalizado (ver lib/otp.ts → normalizarTelefone)
			match: [/^258\d{9}$/, 'Telefone deve estar no formato 258XXXXXXXXX'],
		},
		nome: { type: String, trim: true, default: '' },
		empresaId: { type: Schema.Types.ObjectId, ref: 'Empresa' },
		streakAtual: { type: Number, default: 0, min: 0 },
		maiorStreak: { type: Number, default: 0, min: 0 },
		ultimoDiaPedido: { type: String },
		recompensasGanhas: { type: [RecompensaGanhaSchema], default: [] },
	},
	{ timestamps: true }
)

const Cliente: Model<ICliente> = mongoose.model<ICliente>('Cliente', ClienteSchema)

export default Cliente
