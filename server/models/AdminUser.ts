import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Conta de administrador do painel (Fase 6).
 *
 * Autenticação dedicada por `username` + password (hash via `Bun.password`,
 * bcrypt). Separada da identidade de cliente (telefone+OTP): o painel admin
 * tem o seu próprio login e cookie de sessão. Ver `lib/adminAuth.ts`.
 */

export interface IAdminUser extends Document {
	/** Nome de utilizador (único, minúsculas). */
	username: string
	/** Hash bcrypt da password (nunca a password em claro). */
	passwordHash: string
	/** Nome de apresentação (opcional). */
	nome?: string
	createdAt: Date
	updatedAt: Date
}

const AdminUserSchema = new Schema<IAdminUser>(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			minlength: 3,
		},
		passwordHash: { type: String, required: true },
		nome: { type: String, trim: true, default: '' },
	},
	{ timestamps: true }
)

const AdminUser: Model<IAdminUser> = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema)

export default AdminUser
