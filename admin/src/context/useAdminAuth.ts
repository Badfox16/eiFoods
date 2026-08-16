import { createContext, useContext } from 'react'
import type { ApiAdminUser } from '../lib/api'

/**
 * Contexto e hook da auth do admin, separados do componente `AdminAuthProvider`
 * (AdminAuthContext.tsx) para satisfazer react-refresh/only-export-components.
 */

export interface AdminAuthContextType {
  admin: ApiAdminUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider>')
  return ctx
}
