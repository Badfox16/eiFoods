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

/** @deprecated substituído por menuApi (menu por data de calendário) */
export const scheduleApi = {
  getHoje: () => request('/prato-do-dia/hoje'),
}

export const menuApi = {
  /** Menu do dia atual (timezone Maputo) com pratos populados em itens.pratoId */
  getHoje: () => request('/menu/hoje'),
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

export const streakApi = {
  /** Estado de streak do cliente autenticado (dias, desconto, próxima recompensa). */
  me: () => request('/streak/me'),

  /** Escada de recompensas (pública). */
  config: () => request('/streak/config'),
}

export const planosApi = {
  /** Planos ativos disponíveis para compra. */
  list: () => request('/planos'),
}

export const planoMenuApi = {
  /** Cardápio de uma categoria premium (Fase 7), com pratos populados. */
  get: (categoria) => request(`/planos-menu/${categoria}`),
}

export const subscricoesApi = {
  /** Subscrições do cliente autenticado (mais recentes primeiro). */
  me: () => request('/subscricoes/me'),

  /**
   * Cria uma subscrição pendente. `comprovativo` é um File (opcional).
   * Enviado como multipart/form-data — não definir Content-Type manualmente.
   */
  create: ({ planoId, comprovativo }) => {
    const fd = new FormData()
    fd.append('planoId', planoId)
    if (comprovativo) fd.append('comprovativo', comprovativo)
    return request('/subscricoes', { method: 'POST', body: fd })
  },
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

  /** Atualiza o perfil do cliente da sessão (por agora, só o nome). */
  updateMe: (nome) => request('/auth/me', json('PATCH', { nome })).then((r) => r.cliente),
}
