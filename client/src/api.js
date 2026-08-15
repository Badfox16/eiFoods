const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function request(path, options) {
  // credentials: 'include' → envia/recebe o cookie httpOnly da sessão (auth)
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...options })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function json(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export const pratosApi = {
  /** Lista pratos; passar { disponivel: true } para filtrar */
  list: (params) => {
    const qs = params?.disponivel !== undefined ? `?disponivel=${params.disponivel}` : ''
    return request(`/pratos${qs}`)
  },
}

export const extrasApi = {
  /** Extras globais + exclusivos de um prato específico */
  listForPrato: (pratoId) => request(`/extras/prato/${pratoId}`),
}

export const scheduleApi = {
  getHoje: () => request('/prato-do-dia/hoje'),
}

export const ordersApi = {
  create: (payload) => request('/orders', json('POST', payload)),
}

export const empresasApi = {
  validateCode: (code) => request(`/empresas/codigo/${encodeURIComponent(code.trim().toUpperCase())}`),
}

export const sorteioApi = {
  get: () => request('/sorteio'),

  inscrever: (payload) => request('/sorteio/inscricoes', json('POST', payload)),
}

export const authApi = {
  /** Pede envio de OTP para o telefone. */
  requestOtp: (telefone) => request('/auth/request-otp', json('POST', { telefone })),

  /** Valida o OTP e inicia sessão (cookie httpOnly). Devolve { ok, novo, cliente }. */
  verifyOtp: (telefone, codigo) => request('/auth/verify-otp', json('POST', { telefone, codigo })),

  /** Termina a sessão. */
  logout: () => request('/auth/logout', json('POST', {})),

  /**
   * Devolve o cliente da sessão atual, ou null se não autenticado (401).
   * Usado no arranque para restaurar a sessão a partir do cookie.
   */
  me: async () => {
    try {
      const { cliente } = await request('/auth/me')
      return cliente
    } catch {
      return null
    }
  },
}
