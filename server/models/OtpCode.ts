import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Código OTP temporário associado a um telefone.
 * Sobrevive a restart do servidor (persistido no Mongo) e é limpo
 * automaticamente pelo TTL index em `expiraEm`.
 */
export interface IOtpCode extends Document {
	/** Telefone normalizado (258XXXXXXXXX). */
	telefone: string
	/** Código de 6 dígitos. */
	codigo: string
	/** Nº de tentativas de verificação falhadas. */
	tentativas: number
	/** Momento a partir do qual o documento expira (TTL). */
	expiraEm: Date
	createdAt: Date
	updatedAt: Date
}

const OtpCodeSchema = new Schema<IOtpCode>(
	{
		telefone: { type: String, required: true, trim: true, index: true },
		codigo: { type: String, required: true },
		tentativas: { type: Number, required: true, default: 0, min: 0 },
		expiraEm: { type: Date, required: true },
	},
	{ timestamps: true }
)

// TTL index: o Mongo remove o documento assim que `expiraEm` é ultrapassado.
OtpCodeSchema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 })

const OtpCode: Model<IOtpCode> = mongoose.model<IOtpCode>('OtpCode', OtpCodeSchema)

export default OtpCode
