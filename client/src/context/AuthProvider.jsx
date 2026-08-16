import { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import { authApi } from '../api'

/**
 * Provider de autenticação do cliente (telefone + OTP).
 * A sessão vive num cookie httpOnly; no arranque chamamos /auth/me para
 * restaurar o cliente autenticado. Expõe os passos do fluxo de OTP.
 */
export default function AuthProvider({ children }) {
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaura a sessão a partir do cookie no arranque.
  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((c) => { if (active) setCliente(c) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  /** Passo 1 — pede o envio do código OTP. */
  const requestOtp = useCallback((telefone) => authApi.requestOtp(telefone), [])

  /** Passo 2 — valida o código, inicia sessão e guarda o cliente. */
  const verifyOtp = useCallback(async (telefone, codigo) => {
    const res = await authApi.verifyOtp(telefone, codigo)
    setCliente(res.cliente)
    return res
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setCliente(null)
    }
  }, [])

  /** Recarrega o cliente da sessão (ex.: para refletir o tier premium). */
  const refresh = useCallback(async () => {
    const c = await authApi.me()
    setCliente(c)
    return c
  }, [])

  const value = {
    cliente,
    loading,
    isAuthenticated: Boolean(cliente),
    // Tier premium (Fase 3): concedido por uma subscrição premium ativa.
    premium: Boolean(cliente?.premium),
    requestOtp,
    verifyOtp,
    logout,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
