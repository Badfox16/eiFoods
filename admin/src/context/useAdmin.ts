import { createContext, useContext } from 'react'
import type { ApiPrato, ApiExtra, ApiOrder, ApiSchedule, ApiEmpresa } from '../lib/api'
import type { DishFormData, ExtraFormData, EmpresaFormData, EmpresaMenuFormData } from '../types/admin.types'

/**
 * Contexto e hook do estado global do admin, separados do componente
 * `AdminProvider` (AdminContext.tsx) para satisfazer react-refresh/only-export-components.
 */

export interface AdminState {
  pratos: ApiPrato[]
  extras: ApiExtra[]
  orders: ApiOrder[]
  empresas: ApiEmpresa[]
  schedule: ApiSchedule | null
  loading: boolean
  error: string | null
}

export interface AdminContextType {
  state: AdminState
  // Pratos
  loadPratos: () => Promise<void>
  createPrato: (data: DishFormData) => Promise<void>
  updatePrato: (id: string, data: DishFormData) => Promise<void>
  deletePrato: (id: string) => Promise<void>
  toggleDisponivel: (id: string, val: boolean) => Promise<void>
  // Extras
  loadExtras: () => Promise<void>
  createExtra: (data: ExtraFormData) => Promise<void>
  updateExtra: (id: string, data: Partial<ExtraFormData>) => Promise<void>
  deleteExtra: (id: string) => Promise<void>
  // Prato do Dia
  loadSchedule: () => Promise<void>
  setDayPrato: (dia: string, pratoId: string | null) => Promise<void>
  // Orders
  loadOrders: (status?: string) => Promise<void>
  updateOrderStatus: (id: string, status: ApiOrder['status']) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  // Empresas
  loadEmpresas: () => Promise<void>
  createEmpresa: (data: EmpresaFormData) => Promise<void>
  updateEmpresa: (id: string, data: Partial<EmpresaFormData>) => Promise<void>
  deleteEmpresa: (id: string) => Promise<void>
  regenerateEmpresaCodes: (id: string) => Promise<void>
  toggleEmpresaCode: (empresaId: string, ativo: boolean) => Promise<void>
  createEmpresaMenu: (empresaId: string, data: EmpresaMenuFormData) => Promise<void>
  updateEmpresaMenu: (empresaId: string, menuId: string, data: Partial<EmpresaMenuFormData>) => Promise<void>
  deleteEmpresaMenu: (empresaId: string, menuId: string) => Promise<void>
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin deve ser usado dentro de <AdminProvider>')
  return ctx
}
