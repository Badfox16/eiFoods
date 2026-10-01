import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'
import type { TipoPlano } from './Plano'

/**
 * Menu de pratos dedicado a uma categoria de plano premium (Fase 7).
 *
 * Os planos Premium Nutrição têm pratos diferentes do menu normal do dia
 * (mesmo preço, cardápio próprio pensado para o objetivo — perda de peso ou
 * ganho de massa). Um documento por categoria (`categoria` é única); ao
 * contrário de `Menu`, não há dimensão de data — é o cardápio fixo daquele
 * plano, gerido pelo admin.
 *
 * `classico` não tem `PlanoMenu` — reutiliza o `Menu` normal do dia.
 */
export type CategoriaComMenuProprio = Extract<TipoPlano, 'premium_fit_starter' | 'premium_muscle' | 'premium_equilibrio'>

export const CATEGORIAS_COM_MENU_PROPRIO: CategoriaComMenuProprio[] = ['premium_fit_starter', 'premium_muscle', 'premium_equilibrio']

export interface IPlanoMenuItem {
  pratoId: Types.ObjectId
}

export interface IPlanoMenu extends Document {
  categoria: CategoriaComMenuProprio
  itens: IPlanoMenuItem[]
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

const PlanoMenuItemSchema = new Schema<IPlanoMenuItem>(
  {
    pratoId: { type: Schema.Types.ObjectId, ref: 'Prato', required: true },
  },
  { _id: false }
)

const PlanoMenuSchema = new Schema<IPlanoMenu>(
  {
    categoria: {
      type: String,
      enum: ['premium_fit_starter', 'premium_muscle', 'premium_equilibrio'],
      required: true,
      unique: true,
    },
    itens: { type: [PlanoMenuItemSchema], default: [] },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const PlanoMenu: Model<IPlanoMenu> = mongoose.model<IPlanoMenu>('PlanoMenu', PlanoMenuSchema)
export default PlanoMenu
