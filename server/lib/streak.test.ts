import { describe, expect, it } from 'bun:test'
import { classifyStreak, descontoParaStreak, proximoTier } from './streak'
import { DEFAULT_STREAK_TIERS } from '../models/StreakConfig'
import { getCurrentDateKeyMaputo, getPreviousBusinessDayKey } from './businessTime'

const tiers = DEFAULT_STREAK_TIERS

describe('descontoParaStreak', () => {
	it('sem streak não há desconto', () => {
		expect(descontoParaStreak(0, tiers)).toBe(0)
		expect(descontoParaStreak(2, tiers)).toBe(0)
	})

	it('aplica o maior escalão com dias ≤ streak', () => {
		expect(descontoParaStreak(3, tiers)).toBe(8)
		expect(descontoParaStreak(5, tiers)).toBe(8)
		expect(descontoParaStreak(7, tiers)).toBe(11)
		expect(descontoParaStreak(12, tiers)).toBe(20)
		expect(descontoParaStreak(16, tiers)).toBe(28)
		expect(descontoParaStreak(20, tiers)).toBe(28) // 21/26 são item_gratis, não desconto
		expect(descontoParaStreak(30, tiers)).toBe(40)
	})

	it('escalões item_gratis não contam como desconto', () => {
		// 21 e 26 são marcos item_gratis; o maior desconto ≤ 26 é o de 16→28.
		expect(descontoParaStreak(21, tiers)).toBe(28)
		expect(descontoParaStreak(26, tiers)).toBe(28)
	})

	it('streak muito alto satura no maior desconto', () => {
		expect(descontoParaStreak(100, tiers)).toBe(40)
	})
})

describe('proximoTier', () => {
	it('próximo escalão ainda não atingido', () => {
		expect(proximoTier(0, tiers)?.dias).toBe(3)
		expect(proximoTier(3, tiers)?.dias).toBe(7)
		expect(proximoTier(28, tiers)?.dias).toBe(30)
	})

	it('sem escalões futuros devolve null', () => {
		expect(proximoTier(35, tiers)).toBeNull()
		expect(proximoTier(50, tiers)).toBeNull()
	})
})

describe('classifyStreak', () => {
	const hoje = getCurrentDateKeyMaputo()

	it('primeiro pedido (sem último dia) → broken (reinicia a 1)', () => {
		expect(classifyStreak(undefined, hoje)).toBe('broken')
	})

	it('já pediu hoje → same (idempotente)', () => {
		expect(classifyStreak(hoje, hoje)).toBe('same')
	})

	it('último dia foi o dia útil anterior → consecutive', () => {
		expect(classifyStreak(getPreviousBusinessDayKey(), hoje)).toBe('consecutive')
	})

	it('falhou ≥1 dia útil → broken', () => {
		expect(classifyStreak('2020-01-01', hoje)).toBe('broken')
	})
})
