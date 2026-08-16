import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface IOrderExtra {
  extraId: Types.ObjectId
  nome: string
  preco: number
}

export interface IOrderCustomizations {
  free: string[]       // OpcaoGratuita values
  salt: string        // OpcaoSal value
}

export interface IOrderItem {
  pratoId: Types.ObjectId
  pratoNome: string
  pratoPreco: number
  customizations: IOrderCustomizations
  extras: IOrderExtra[]
  isForaDoDia: boolean
  foraDoDiaTaxa: number
  /** Prato pago com uma refeição de subscrição (não cobra o preço base). */
  pagoComPlano: boolean
  total: number
}

export interface IDeliveryDetails {
  name: string
  company: string
  location: string
  contact: string
}

export interface IOrder extends Document {
  empresaId?: Types.ObjectId
  empresaCodigo?: string
  /** Cliente autenticado (opcional — pedidos anónimos continuam a funcionar). */
  clienteId?: Types.ObjectId
  /** Subscrição de plano usada para pagar refeições deste pedido (se houver). */
  subscricaoId?: Types.ObjectId
  items: IOrderItem[]
  deliveryDetails: IDeliveryDetails
  status: OrderStatus
  foraDoDiaCount: number
  taxaForaDoDia: number
  /** Total bruto (soma dos itens), antes de plano e desconto de streak. */
  subtotal: number
  /** Nº de refeições de subscrição consumidas neste pedido. */
  refeicoesConsumidas: number
  /** Valor coberto pelas refeições de subscrição (preços base dos pratos pagos com plano). */
  valorPlanoCoberto: number
  /** Percentagem de desconto de streak aplicada. */
  descontoStreakPercent: number
  /** Valor absoluto do desconto de streak. */
  descontoStreakValor: number
  /** Total final cobrado (subtotal − plano − desconto de streak). */
  total: number
  createdAt: Date
  updatedAt: Date
}

const OrderExtraSchema = new Schema<IOrderExtra>(
  {
    extraId: { type: Schema.Types.ObjectId, ref: 'Extra', required: true },
    nome:    { type: String, required: true },
    preco:   { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const OrderCustomizationsSchema = new Schema<IOrderCustomizations>(
  {
    free: [{ type: String }],
    salt: { type: String, default: 'Normal' },
  },
  { _id: false }
)

const OrderItemSchema = new Schema<IOrderItem>(
  {
    pratoId:        { type: Schema.Types.ObjectId, ref: 'Prato', required: true },
    pratoNome:      { type: String, required: true },
    pratoPreco:     { type: Number, required: true, min: 0 },
    customizations: { type: OrderCustomizationsSchema, required: true },
    extras:         { type: [OrderExtraSchema], default: [] },
    isForaDoDia:    { type: Boolean, default: false },
    foraDoDiaTaxa:  { type: Number, required: true, min: 0, default: 0 },
    pagoComPlano:   { type: Boolean, default: false },
    total:          { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const DeliveryDetailsSchema = new Schema<IDeliveryDetails>(
  {
    name:     { type: String, required: true, trim: true },
    company:  { type: String, default: '' },
    location: { type: String, required: true, trim: true },
    contact:  { type: String, required: true, trim: true },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    empresaId:       { type: Schema.Types.ObjectId, ref: 'Empresa', required: false },
    empresaCodigo:   { type: String, required: false, trim: true },
    clienteId:       { type: Schema.Types.ObjectId, ref: 'Cliente', required: false },
    subscricaoId:    { type: Schema.Types.ObjectId, ref: 'Subscricao', required: false },
    items:           { type: [OrderItemSchema], required: true },
    deliveryDetails: { type: DeliveryDetailsSchema, required: true },
    status:          { type: String, enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'], default: 'pending' },
    foraDoDiaCount:  { type: Number, required: true, min: 0, default: 0 },
    taxaForaDoDia:   { type: Number, required: true, min: 0, default: 0 },
    subtotal:              { type: Number, required: true, min: 0, default: 0 },
    refeicoesConsumidas:   { type: Number, required: true, min: 0, default: 0 },
    valorPlanoCoberto:     { type: Number, required: true, min: 0, default: 0 },
    descontoStreakPercent: { type: Number, required: true, min: 0, default: 0 },
    descontoStreakValor:   { type: Number, required: true, min: 0, default: 0 },
    total:           { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema)
export default Order
