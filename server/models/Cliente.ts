import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

/**
 * Cliente singular — conta leve identificada por telefone (+ OTP).
 * Base para streaks, planos e histórico. As funcionalidades de empresa
 * ficam em standby: `empresaId` é opcional e não é exigido no fluxo atual.
 *
 * Nota de extensibilidade: os campos de streak (streakAtual, maiorStreak,
 * ultimoDiaPedido, recompensasResgatadas) serão adicionados numa fase
 * posterior (Fase 4). Adicioná-los mais tarde é uma alteração aditiva e
 * não-destrutiva ao schema.
 */
export interface ICliente extends Document {
	/** Telefone normalizado no formato 258XXXXXXXXX (único). */
	telefone: string
	/** Nome do cliente (opcional; pode ser preenchido no primeiro pedido). */
	nome?: string
	/** Empresa associada (opcional — empresa em standby). */
	empresaId?: Types.ObjectId
	createdAt: Date
	updatedAt: Date
}

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
	},
	{ timestamps: true }
)

const Cliente: Model<ICliente> = mongoose.model<ICliente>('Cliente', ClienteSchema)

export default Cliente
