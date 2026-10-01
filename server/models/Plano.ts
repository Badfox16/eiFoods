import mongoose, { type Document, type Model, Schema } from 'mongoose'

/**
 * Plano pré-pago (Fase 2; categorias/duração — Fase 7). Configurável pelo admin.
 *
 * Um plano define um pacote de refeições (`numRefeicoes`) que o cliente compra
 * adiantado por um preço fixo. Ao ser ativado (após confirmação manual do
 * pagamento pelo admin), gera uma `Subscricao` com o saldo de refeições e uma
 * janela de validade (`validadeDias`).
 *
 * Dois eixos independentes (Fase 7) que se combinam:
 *  - `categoria`: tipo de dieta — Clássico (menu normal), Premium Fit Starter
 *    (perda de peso) ou Premium Muscle (ganho de massa). Categorias premium
 *    têm um menu de pratos próprio (`PlanoMenu`), separado do menu normal.
 *  - `duracao`: modalidade — Starter (semanal/5), Plus (quinzenal/15) ou
 *    Mensal (20). Renomeado de `tipo` para não colidir com `categoria`.
 *
 * `duracao` é sobretudo uma etiqueta de conveniência para os presets
 * habituais. O que conta para o saldo e a validade são `numRefeicoes` e
 * `validadeDias` — sempre configuráveis independentemente do preset.
 */

/** @deprecated substituído por DuracaoPlano (mesmos valores, nome mais claro). */
export type PlanoTipo = 'semanal' | 'bissemanal' | 'mensal'

export type DuracaoPlano = 'starter' | 'plus' | 'mensal'

export type TipoPlano = 'classico' | 'premium_fit_starter' | 'premium_muscle' | 'premium_equilibrio'

/**
 * Unidade do preço. TODO(produto): ambiguidade não resolvida — "195 MZN" do
 * plano Starter pode ser o preço TOTAL do pacote ou o preço POR REFEIÇÃO.
 * Este campo torna a leitura explícita em vez de assumir uma das duas; ver
 * ROADMAP.md (Fase 7) para o TODO completo.
 */
export type PrecoUnidade = 'total' | 'por_refeicao'

export interface IPlano extends Document {
	nome: string
	categoria: TipoPlano
	duracao: DuracaoPlano
	/** Nº de refeições creditadas ao ativar. */
	numRefeicoes: number
	/** Preço do pacote (MZN). `null` = por definir — UI mostra "Preço a confirmar". */
	preco: number | null
	precoUnidade: PrecoUnidade
	/** Dias de validade a contar da ativação. */
	validadeDias: number
	/**
	 * Plano premium (Fase 3): uma subscrição ativa deste plano concede ao cliente
	 * o tier premium, que desbloqueia pratos exclusivos no menu do dia. Derivado
	 * de `categoria !== 'classico'` ao criar/editar (mantido como campo próprio
	 * por compatibilidade com a Fase 3, que não conhece `categoria`).
	 */
	premium: boolean
	descricao: string
	ativo: boolean
	createdAt: Date
	updatedAt: Date
}

const PlanoSchema = new Schema<IPlano>(
	{
		nome: { type: String, required: true, trim: true },
		categoria: {
			type: String,
			enum: ['classico', 'premium_fit_starter', 'premium_muscle', 'premium_equilibrio'],
			required: true,
			default: 'classico',
			index: true,
		},
		duracao: { type: String, enum: ['starter', 'plus', 'mensal'], required: true },
		numRefeicoes: { type: Number, required: true, min: 1 },
		preco: { type: Number, min: 0, default: null },
		precoUnidade: { type: String, enum: ['total', 'por_refeicao'], default: 'total' },
		validadeDias: { type: Number, required: true, min: 1 },
		premium: { type: Boolean, default: false },
		descricao: { type: String, trim: true, default: '' },
		ativo: { type: Boolean, default: true },
	},
	{ timestamps: true }
)

const Plano: Model<IPlano> = mongoose.model<IPlano>('Plano', PlanoSchema)

export default Plano
