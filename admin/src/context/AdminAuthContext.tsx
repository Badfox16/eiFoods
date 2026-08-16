/**
 * Autenticação do painel admin (Fase 6).
 * Guarda o admin da sessão, verifica `/admin/me` no arranque e expõe
 * `login`/`logout`. Regista um handler global de 401 (api.ts) para voltar ao
 * ecrã de login se a sessão expirar a meio de uma ação.
 *
 * O contexto e o hook `useAdminAuth` vivem em ./useAdminAuth (separados para
 * fast-refresh). Este ficheiro exporta apenas o componente Provider.
 */

import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { adminAuthApi, setUnauthorizedHandler, type ApiAdminUser } from '../lib/api'
import { AdminAuthContext } from './useAdminAuth'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<ApiAdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 401 em qualquer chamada → limpa a sessão local e volta ao login.
    setUnauthorizedHandler(() => setAdmin(null))

    void (async () => {
      try {
        const { admin } = await adminAuthApi.me()
        setAdmin(admin)
      } catch {
        setAdmin(null)
      } finally {
        setLoading(false)
      }
    })()

    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { admin } = await adminAuthApi.login(username, password)
    setAdmin(admin)
  }, [])

  const logout = useCallback(async () => {
    await adminAuthApi.logout().catch(() => {})
    setAdmin(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
