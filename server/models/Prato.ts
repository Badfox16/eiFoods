import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

export interface IImagem {
  url: string
  publicId: string
}

export interface IPrato extends Document {
  nome: string
  descricao: string
  preco: number
  imagem: IImagem
  /** @deprecated — substituído por Menu. flag legada: está no menu de hoje? */
  disponivel: boolean
  extrasProprios: Types.ObjectId[]  // extras exclusivos deste prato
  createdAt: Date
  updatedAt: Date
}

const ImagemSchema = new Schema<IImagem>(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
)

const PratoSchema = new Schema<IPrato>(
  {
    nome:          { type: String, required: true, trim: true },
    descricao:     { type: String, default: '' },
    preco:         { type: Number, required: true, min: 0 },
    imagem:        { type: ImagemSchema, required: true },
    disponivel:    { type: Boolean, default: false },
    extrasProprios: [{ type: Schema.Types.ObjectId, ref: 'Extra' }],
  },
  { timestamps: true }
)

const Prato: Model<IPrato> = mongoose.model<IPrato>('Prato', PratoSchema)
export default Prato
