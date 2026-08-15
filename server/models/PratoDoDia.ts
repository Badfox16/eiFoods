/**
 * @deprecated — substituído por Menu (server/models/Menu.ts).
 * Agenda semanal (1 prato por dia da semana). Mantido para não partir código
 * ainda a decorrer noutra fase; não usar em código novo.
 */
import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

export type DiaSemana = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'

export const DIAS_SEMANA: DiaSemana[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

export interface IDiaAgendado {
  diaSemana: DiaSemana
  prato: Types.ObjectId | null
}

export interface IPratoDoDia extends Document {
  // Singleton — always the same _id sentinel
  semana: IDiaAgendado[]
  updatedAt: Date
}

const DiaAgendadoSchema = new Schema<IDiaAgendado>(
  {
    diaSemana: { type: String, enum: DIAS_SEMANA, required: true },
    prato:     { type: Schema.Types.ObjectId, ref: 'Prato', default: null },
  },
  { _id: false }
)

const PratoDoDiaSchema = new Schema<IPratoDoDia>(
  {
    semana: { type: [DiaAgendadoSchema], default: () => DIAS_SEMANA.map(d => ({ diaSemana: d, prato: null })) },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
)

const PratoDoDia: Model<IPratoDoDia> = mongoose.model<IPratoDoDia>('PratoDoDia', PratoDoDiaSchema)
export default PratoDoDia
