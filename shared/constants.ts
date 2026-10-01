/**
 * eiFoods - Constants
 * Constantes compartilhadas da aplicação
 */

import type { OpcaoGratuita, OpcaoSal, DuracaoPlano, TipoPlano, ObjetivoCliente } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// Opções de Menu
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Opções gratuitas disponíveis para personalização
 */
export const OPCOES_GRATUITAS: readonly OpcaoGratuita[] = [
  'Sem Molho',
  'Com Molho',
  'Sem Piripiri',
  'Com Piripiri',
] as const

/**
 * Níveis de sal disponíveis
 */
export const OPCOES_SAL: readonly OpcaoSal[] = [
  'Sem Sal',
  'Pouco Sal',
  'Normal',
] as const

// ═══════════════════════════════════════════════════════════════════════════
// Validação
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Regex para validação de número de telefone moçambicano
 * Formato: 258XXXXXXXXX ou 8XXXXXXXX ou +258XXXXXXXXX
 */
export const PHONE_REGEX = /^(\+?258)?8[2-7]\d{7}$/

/**
 * Comprimento mínimo para o nome
 */
export const MIN_NAME_LENGTH = 3

/**
 * Comprimento mínimo para a localização
 */
export const MIN_LOCATION_LENGTH = 5

// ═══════════════════════════════════════════════════════════════════════════
// Configurações de UI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Breakpoints responsivos (em pixels)
 */
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const

/**
 * Durações de animação (em ms)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 220,
  slow: 300,
} as const

/**
 * Tamanho máximo de itens por pedido
 */
export const MAX_ORDER_ITEMS = 20

// ═══════════════════════════════════════════════════════════════════════════
// Rotas
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rotas da aplicação
 */
export const ROUTES = {
  HOME: '/',
  MENU: '/menu',
  CUSTOMIZE: '/customize',
  ORDER_SUMMARY: '/order-summary',
  DELIVERY: '/delivery',
  CONFIRMATION: '/confirmation',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Mensagens
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mensagens de erro
 */
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_PHONE: 'Número de telefone inválido',
  INVALID_NAME: `Nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres`,
  INVALID_LOCATION: `Local deve ter pelo menos ${MIN_LOCATION_LENGTH} caracteres`,
  EMPTY_CART: 'Carrinho vazio',
  MAX_ITEMS_REACHED: `Máximo de ${MAX_ORDER_ITEMS} itens por pedido`,
} as const

/**
 * Mensagens de sucesso
 */
export const SUCCESS_MESSAGES = {
  ITEM_ADDED: 'Item adicionado ao carrinho',
  ITEM_REMOVED: 'Item removido do carrinho',
  ORDER_PLACED: 'Pedido realizado com sucesso',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// Planos — categorias, duração e objetivo (Fase 7)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuração de cada modalidade de duração: dias, nº de refeições e o rótulo
 * mostrado ao cliente. Fonte única de verdade para o seed e para a UI —
 * nunca hardcode "5 refeições"/"195 MZN" num componente.
 */
export const DURACAO_CONFIG: Record<DuracaoPlano, { label: string; dias: number; numRefeicoes: number }> = {
  starter: { label: 'Starter', dias: 5, numRefeicoes: 5 },
  plus: { label: 'Plus', dias: 15, numRefeicoes: 15 },
  mensal: { label: 'Mensal', dias: 20, numRefeicoes: 20 },
} as const

export const DURACAO_ORDEM: readonly DuracaoPlano[] = ['starter', 'plus', 'mensal'] as const

/** Rótulos das categorias de plano (tipo de dieta). */
export const CATEGORIA_LABEL: Record<TipoPlano, string> = {
  classico: 'Clássico',
  premium_fit_starter: 'Premium Fit Starter',
  premium_muscle: 'Premium Muscle',
  premium_equilibrio: 'Premium Equilíbrio',
} as const

/** Descrição curta de cada categoria, usada nos cartões de escolha. */
export const CATEGORIA_DESCRICAO: Record<TipoPlano, string> = {
  classico: 'Mesmos pratos e preços do menu normal do dia.',
  premium_fit_starter: 'Perda de peso: menos calorias, mais vegetais, proteína magra, menos fritos.',
  premium_muscle: 'Ganho de massa: maior teor proteico, mais calorias, mais carboidratos complexos.',
  premium_equilibrio: 'Manutenção: calorias e macros moderados, pratos variados para o dia a dia.',
} as const

export const OBJETIVO_LABEL: Record<ObjetivoCliente, string> = {
  perder_peso: 'Perder peso',
  manter_peso: 'Manter peso',
  ganhar_massa: 'Ganhar massa muscular',
  alimentacao_equilibrada: 'Alimentação equilibrada',
} as const

export const OBJETIVO_ORDEM: readonly ObjetivoCliente[] = [
  'perder_peso',
  'manter_peso',
  'ganhar_massa',
  'alimentacao_equilibrada',
] as const

/**
 * Encaminhamento objetivo → categoria de plano, mostrado depois da pergunta
 * "Qual é o seu objetivo?" no fluxo Premium Nutrição. Os 4 objetivos mapeiam
 * todos para um subplano premium dedicado — "manter_peso" e
 * "alimentacao_equilibrada" partilham o mesmo subplano (`premium_equilibrio`),
 * já que são, na prática, o mesmo perfil nutricional (calorias/macros
 * moderados). Nenhum objetivo cai no Clássico — toda a UI (Planos.jsx) lê
 * deste mapa e não tem lógica própria de fallback.
 */
export const OBJETIVO_PARA_CATEGORIA: Record<ObjetivoCliente, TipoPlano> = {
  perder_peso: 'premium_fit_starter',
  manter_peso: 'premium_equilibrio',
  ganhar_massa: 'premium_muscle',
  alimentacao_equilibrada: 'premium_equilibrio',
} as const
