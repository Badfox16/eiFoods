/**
 * eiFoods - Type Definitions
 * Definições de tipos baseadas nos mocks da aplicação
 */

// ═══════════════════════════════════════════════════════════════════════════
// Menu & Pratos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Imagem de um prato armazenada no Cloudinary
 */
export interface ImagemPrato {
  url: string
  publicId: string
}

/**
 * Representa um prato disponível no menu do dia
 */
export interface Prato {
  /** MongoDB ObjectId como string */
  _id?: string
  /** @deprecated usar _id. Mantido para compatibilidade com mock data. */
  id?: number | string
  nome: string
  preco: number
  /** Imagem armazenada no Cloudinary */
  imagem: ImagemPrato
  /** @deprecated usar imagem.url */
  emoji?: string
  descricao: string
  /** Flag: prato está disponível no menu de hoje? */
  disponivel?: boolean
  /** IDs dos extras exclusivos deste prato */
  extrasProprios?: string[]
  createdAt?: Date | string
  updatedAt?: Date | string
}

/**
 * Representa um extra pago que pode ser adicionado a um prato
 */
export interface Extra {
  /** MongoDB ObjectId como string */
  _id?: string
  /** @deprecated usar _id */
  id?: string
  nome: string
  preco: number
  /** true = disponível para todos os pratos; false = exclusivo de pratos específicos */
  global?: boolean
  ativo?: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// ═══════════════════════════════════════════════════════════════════════════
// Customizações & Opções
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opções gratuitas disponíveis para personalização
 */
export type OpcaoGratuita = 
  | 'Sem Molho'
  | 'Com Molho'
  | 'Sem Piripiri'
  | 'Com Piripiri'

/**
 * Níveis de sal disponíveis
 */
export type OpcaoSal = 'Sem Sal' | 'Pouco Sal' | 'Normal'

/**
 * Personalizações aplicadas a um prato
 */
export interface Customizacoes {
  free: OpcaoGratuita[]
  /** Extra pago selecionado — null se nenhum (UI: selecção única) */
  paid: Extra | null
  /** Lista de extras pagos (para envio à API — suporta múltiplos) */
  paidExtras?: Extra[]
  salt: OpcaoSal
}

// ═══════════════════════════════════════════════════════════════════════════
// Pedidos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Item individual de um pedido (prato + customizações)
 */
export interface OrderItem {
  prato: Prato
  customizations: Customizacoes
  isForaDoDia?: boolean
  foraDoDiaTaxa?: number
  total: number
}

/**
 * Detalhes de entrega do pedido
 */
export interface DeliveryDetails {
  name: string
  company: string
  location: string
  contact: string
}

export interface EmpresaMenu {
  _id: string
  nome: string
  ativo: boolean
  pratoIds: Prato[] | string[]
}

export interface Empresa {
  _id: string
  nome: string
  ativo: boolean
  nrFuncionariosPagos: number
  menus: EmpresaMenu[]
  codigo: string
  codigoAtivo: boolean
  maxUsosDia: number
  usosDiaAtual: number
  ultimoResetDia: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface EmpresaCodigoValidation {
  empresaId: string
  empresaNome: string
  codigo: string
  usosRestantesHoje: number
  menu: EmpresaMenu
}

// ═══════════════════════════════════════════════════════════════════════════
// Identidade do cliente (telefone + OTP)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cliente singular — conta leve identificada por telefone.
 * Base para streaks, planos e histórico. `empresaId` é opcional (empresa em standby).
 */
export interface Cliente {
  /** MongoDB ObjectId como string */
  _id: string
  /** Telefone normalizado no formato 258XXXXXXXXX */
  telefone: string
  nome?: string
  /** Empresa associada (opcional — em standby) */
  empresaId?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

/**
 * Sessão de autenticação do cliente no client.
 * A sessão real vive num cookie httpOnly; este tipo descreve o estado no contexto.
 */
export interface AuthSession {
  /** Cliente autenticado, ou null quando não há sessão */
  cliente: Cliente | null
  /** Se ainda está a resolver a sessão inicial (/auth/me) */
  loading: boolean
}

/** Resposta de POST /api/auth/verify-otp */
export interface VerifyOtpResponse {
  ok: boolean
  /** true se o cliente foi criado agora (primeiro login) */
  novo: boolean
  cliente: Cliente
}

/** Resposta de POST /api/auth/request-otp */
export interface RequestOtpResponse {
  ok: boolean
  telefone: string
  message: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Estado da Aplicação
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado global da aplicação gerenciado pelo OrderContext
 */
export interface OrderState {
  selectedDish: Prato | null
  customizations: Customizacoes
  orderItems: OrderItem[]
  deliveryDetails: DeliveryDetails
  selectedEmpresa: EmpresaCodigoValidation | null
  empresaCodigo: string
}

/**
 * Ações disponíveis no OrderContext reducer
 */
export type OrderAction =
  | { type: 'SELECT_DISH'; payload: Prato }
  | { type: 'SET_CUSTOMIZATION'; payload: Partial<Customizacoes> }
  | { type: 'ADD_TO_ORDER'; payload: OrderItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'SET_DELIVERY_DETAILS'; payload: Partial<DeliveryDetails> }
  | { type: 'SET_EMPRESA_CODIGO'; payload: string }
  | { type: 'SET_EMPRESA_SELECIONADA'; payload: EmpresaCodigoValidation | null }
  | { type: 'RESET_ORDER' }

// ═══════════════════════════════════════════════════════════════════════════
// Menu por dia (menu por data de calendário)
// ═══════════════════════════════════════════════════════════════════════════

/** Item de um menu — prato mais flags de destaque/exclusivo */
export interface MenuItem {
  /** Populado com o prato completo (server popula `itens.pratoId`) */
  pratoId: Prato | string
  /** Assume o papel visual do antigo "prato do dia" */
  destaque?: boolean
  /** Prato exclusivo (tier premium — Fase 3) */
  exclusivo?: boolean
}

/** Menu de um dia de calendário (chave `data` no formato AAAA-MM-DD, timezone Maputo) */
export interface Menu {
  _id?: string
  /** Chave do dia no formato AAAA-MM-DD */
  data: string
  itens: MenuItem[]
  ativo: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

// ═══════════════════════════════════════════════════════════════════════════
// Agenda Semanal / Prato do Dia  (@deprecated — substituído por Menu)
// ═══════════════════════════════════════════════════════════════════════════

/** Dias de serviço (2ª a sábado) */
export type DiaSemana = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado'

export const DIAS_SEMANA: DiaSemana[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

/** @deprecated substituído por MenuItem. Entrada de um dia no agendamento semanal */
export interface DiaAgendado {
  diaSemana: DiaSemana
  prato: Prato | null
}

/** @deprecated substituído por Menu. Documento de agendamento semanal (singleton no servidor) */
export interface AgendaSemanal {
  semana: DiaAgendado[]
  updatedAt?: Date | string
}

// ═══════════════════════════════════════════════════════════════════════════
// Encomendas
// ═══════════════════════════════════════════════════════════════════════════

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

// ═══════════════════════════════════════════════════════════════════════════
// Configuração
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configurações gerais da aplicação
 */
export interface AppConfig {
  whatsappNumero: string
  horaEntrega: string
  nomeEmpresa: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipo do contexto de pedidos
 */
export interface OrderContextType {
  state: OrderState
  dispatch: (action: OrderAction) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// Streak / Sequência (Fase 4)
// ═══════════════════════════════════════════════════════════════════════════

export type StreakTierTipo = 'desconto' | 'item_gratis'

/** Escalão da escada de recompensas (configurável no admin). */
export interface StreakTier {
  /** Dias úteis consecutivos necessários. */
  dias: number
  tipo: StreakTierTipo
  /** Percentagem (para `desconto`); ignorado para `item_gratis`. */
  valor: number
  descricao: string
}

/** Recompensa de item grátis ganha ao atingir um marco. */
export interface RecompensaGanha {
  _id?: string
  dias: number
  descricao: string
  ganhoEm: Date | string
  /** Marcado pelo admin quando entregue. */
  cumprida: boolean
}

/** Estado de streak devolvido por GET /api/streak/me. */
export interface StreakInfo {
  streakAtual: number
  maiorStreak: number
  ultimoDiaPedido: string | null
  descontoAtual: number
  proximaRecompensa: StreakTier | null
  tiers: StreakTier[]
  recompensasGanhas: RecompensaGanha[]
}

// ═══════════════════════════════════════════════════════════════════════════
// Planos pré-pagos & Subscrições (Fase 2)
// ═══════════════════════════════════════════════════════════════════════════

export type PlanoTipo = 'semanal' | 'bissemanal' | 'mensal'

/** Plano pré-pago configurável no admin. */
export interface Plano {
  _id?: string
  nome: string
  tipo: PlanoTipo
  /** Nº de refeições creditadas ao ativar. */
  numRefeicoes: number
  /** Preço total do pacote (MZN). */
  preco: number
  /** Dias de validade a contar da ativação. */
  validadeDias: number
  /** Plano premium: concede tier premium (desbloqueia exclusivos) — Fase 3. */
  premium?: boolean
  descricao?: string
  ativo?: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

export type SubscricaoEstado = 'pendente_pagamento' | 'ativa' | 'expirada' | 'rejeitada'

export interface Comprovativo {
  url: string
  publicId: string
}

/** Subscrição de um plano por um cliente. */
export interface Subscricao {
  _id?: string
  /** ObjectId, ou objeto populado no admin ({ telefone, nome }). */
  clienteId: string | { _id: string; telefone: string; nome?: string }
  /** ObjectId, ou objeto populado no admin ({ nome, tipo }). */
  planoId: string | { _id: string; nome: string; tipo: PlanoTipo }
  /** Snapshot do plano à data da compra. */
  planoNome: string
  numRefeicoes: number
  preco: number
  /** Snapshot: plano premium (concede tier premium enquanto ativa) — Fase 3. */
  premium?: boolean
  refeicoesRestantes: number
  estado: SubscricaoEstado
  comprovativo?: Comprovativo
  dataInicio?: Date | string
  dataExpiracao?: Date | string
  notaAdmin?: string
  createdAt?: Date | string
  updatedAt?: Date | string
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipo auxiliar para garantir que um valor não é nulo nem undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Tipo auxiliar para tornar todas as propriedades opcionais
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P]
}
