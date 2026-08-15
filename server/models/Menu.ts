import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'
import { getCurrentDateKeyMaputo } from '../lib/businessTime'

/** Item de um menu — referencia um prato e marca destaque/exclusivo */
export interface IMenuItem {
  pratoId: Types.ObjectId
  destaque: boolean
  exclusivo: boolean
}

/** Menu de um dia de calendário (chave `data` no formato AAAA-MM-DD, timezone Maputo) */
export interface IMenu extends Document {
  data: string
  itens: IMenuItem[]
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

/** Chave de dia atual (timezone Maputo) usada como default e nas rotas */
export function getCurrentMenuDateKey(): string {
  return getCurrentDateKeyMaputo()
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    pratoId:   { type: Schema.Types.ObjectId, ref: 'Prato', required: true },
    destaque:  { type: Boolean, default: false },
    exclusivo: { type: Boolean, default: false },
  },
  { _id: false }
)

const MenuSchema = new Schema<IMenu>(
  {
    data:  { type: String, required: true, unique: true, default: getCurrentMenuDateKey },
    itens: { type: [MenuItemSchema], default: [] },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Menu: Model<IMenu> = mongoose.model<IMenu>('Menu', MenuSchema)
export default Menu
