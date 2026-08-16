/**
 * Context para gestão do estado global da aplicação Admin.
 * Carrega dados da API no mount e expõe funções assíncronas para CRUD.
 */

import { useEffect, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  pratosApi, extrasApi, scheduleApi, ordersApi, empresasApi,
  type ApiPrato, type ApiExtra, type ApiOrder, type ApiSchedule, type ApiEmpresa,
} from '../lib/api'
import type { DishFormData, ExtraFormData, EmpresaFormData, EmpresaMenuFormData } from '../types/admin.types'
import { AdminContext, type AdminState } from './useAdmin'

// ═══════════════════════════════════════════════════════════════════════════
// State & Actions
// ═══════════════════════════════════════════════════════════════════════════

type AdminAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_PRATOS'; payload: ApiPrato[] }
  | { type: 'ADD_PRATO'; payload: ApiPrato }
  | { type: 'UPDATE_PRATO'; payload: ApiPrato }
  | { type: 'DELETE_PRATO'; payload: string }
  | { type: 'LOAD_EXTRAS'; payload: ApiExtra[] }
  | { type: 'ADD_EXTRA'; payload: ApiExtra }
  | { type: 'UPDATE_EXTRA'; payload: ApiExtra }
  | { type: 'DELETE_EXTRA'; payload: string }
  | { type: 'LOAD_ORDERS'; payload: ApiOrder[] }
  | { type: 'UPDATE_ORDER'; payload: ApiOrder }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'LOAD_EMPRESAS'; payload: ApiEmpresa[] }
  | { type: 'ADD_EMPRESA'; payload: ApiEmpresa }
  | { type: 'UPDATE_EMPRESA'; payload: ApiEmpresa }
  | { type: 'DELETE_EMPRESA'; payload: string }
  | { type: 'SET_SCHEDULE'; payload: ApiSchedule }

// ═══════════════════════════════════════════════════════════════════════════
// Reducer
// ═══════════════════════════════════════════════════════════════════════════

const initialState: AdminState = {
  pratos: [],
  extras: [],
  orders: [],
  empresas: [],
  schedule: null,
  loading: true,
  error: null,
}

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'SET_LOADING':   return { ...state, loading: action.payload }
    case 'SET_ERROR':     return { ...state, error: action.payload, loading: false }
    case 'LOAD_PRATOS':   return { ...state, pratos: action.payload }
    case 'LOAD_EXTRAS':   return { ...state, extras: action.payload }
    case 'LOAD_ORDERS':   return { ...state, orders: action.payload }
    case 'LOAD_EMPRESAS': return { ...state, empresas: action.payload }
    case 'SET_SCHEDULE':  return { ...state, schedule: action.payload }

    case 'ADD_PRATO':
      return { ...state, pratos: [action.payload, ...state.pratos] }
    case 'UPDATE_PRATO':
      return { ...state, pratos: state.pratos.map(p => p._id === action.payload._id ? action.payload : p) }
    case 'DELETE_PRATO':
      return { ...state, pratos: state.pratos.filter(p => p._id !== action.payload) }

    case 'ADD_EXTRA':
      return { ...state, extras: [action.payload, ...state.extras] }
    case 'UPDATE_EXTRA':
      return { ...state, extras: state.extras.map(e => e._id === action.payload._id ? action.payload : e) }
    case 'DELETE_EXTRA':
      return { ...state, extras: state.extras.filter(e => e._id !== action.payload) }

    case 'UPDATE_ORDER':
      return { ...state, orders: state.orders.map(o => o._id === action.payload._id ? action.payload : o) }
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter(o => o._id !== action.payload) }

    case 'ADD_EMPRESA':
      return { ...state, empresas: [action.payload, ...state.empresas] }
    case 'UPDATE_EMPRESA':
      return { ...state, empresas: state.empresas.map(e => e._id === action.payload._id ? action.payload : e) }
    case 'DELETE_EMPRESA':
      return { ...state, empresas: state.empresas.filter(e => e._id !== action.payload) }

    default: return state
  }
}

// ── Helper: build FormData from DishFormData ─────────────────────────────────
function buildPratoFormData(data: DishFormData): FormData {
  const fd = new FormData()
  fd.append('nome', data.nome)
  fd.append('descricao', data.descricao)
  fd.append('preco', String(data.preco))
  fd.append('disponivel', String(data.disponivel))
  if (data.imageFile) fd.append('imagem', data.imageFile)
  if (data.extrasProprios?.length)
    fd.append('extrasProprios', JSON.stringify(data.extrasProprios))
  return fd
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, initialState)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const [pratos, extras, orders, schedule] = await Promise.all([
          pratosApi.list(),
          extrasApi.list(),
          ordersApi.list(),
          scheduleApi.get(),
        ])
        dispatch({ type: 'LOAD_PRATOS',  payload: pratos })
        dispatch({ type: 'LOAD_EXTRAS',  payload: extras })
        dispatch({ type: 'LOAD_ORDERS',  payload: orders })
        dispatch({ type: 'SET_SCHEDULE', payload: schedule })
      } catch (e) {
        dispatch({ type: 'SET_ERROR', payload: (e as Error).message })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    })()
  }, [])

  // ── Pratos ────────────────────────────────────────────────────────────────
  const loadPratos = useCallback(async () => {
    dispatch({ type: 'LOAD_PRATOS', payload: await pratosApi.list() })
  }, [])

  const createPrato = useCallback(async (data: DishFormData) => {
    if (!data.imageFile) throw new Error('Imagem obrigatória')
    const prato = await pratosApi.create(buildPratoFormData(data))
    dispatch({ type: 'ADD_PRATO', payload: prato })
  }, [])

  const updatePrato = useCallback(async (id: string, data: DishFormData) => {
    const prato = await pratosApi.update(id, buildPratoFormData(data))
    dispatch({ type: 'UPDATE_PRATO', payload: prato })
  }, [])

  const deletePrato = useCallback(async (id: string) => {
    await pratosApi.delete(id)
    dispatch({ type: 'DELETE_PRATO', payload: id })
  }, [])

  const toggleDisponivel = useCallback(async (id: string, val: boolean) => {
    const prato = await pratosApi.toggleDisponivel(id, val)
    dispatch({ type: 'UPDATE_PRATO', payload: prato })
  }, [])

  // ── Extras ────────────────────────────────────────────────────────────────
  const loadExtras = useCallback(async () => {
    dispatch({ type: 'LOAD_EXTRAS', payload: await extrasApi.list() })
  }, [])

  const createExtra = useCallback(async (data: ExtraFormData) => {
    const extra = await extrasApi.create(data)
    dispatch({ type: 'ADD_EXTRA', payload: extra })
  }, [])

  const updateExtra = useCallback(async (id: string, data: Partial<ExtraFormData>) => {
    const extra = await extrasApi.update(id, data)
    dispatch({ type: 'UPDATE_EXTRA', payload: extra })
  }, [])

  const deleteExtra = useCallback(async (id: string) => {
    await extrasApi.delete(id)
    dispatch({ type: 'DELETE_EXTRA', payload: id })
  }, [])

  // ── Prato do Dia ──────────────────────────────────────────────────────────
  const loadSchedule = useCallback(async () => {
    dispatch({ type: 'SET_SCHEDULE', payload: await scheduleApi.get() })
  }, [])

  const setDayPrato = useCallback(async (dia: string, pratoId: string | null) => {
    const schedule = await scheduleApi.setDay(dia, pratoId)
    dispatch({ type: 'SET_SCHEDULE', payload: schedule })
  }, [])

  // ── Orders ────────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async (status?: string) => {
    dispatch({ type: 'LOAD_ORDERS', payload: await ordersApi.list(status) })
  }, [])

  const updateOrderStatus = useCallback(async (id: string, status: ApiOrder['status']) => {
    const order = await ordersApi.updateStatus(id, status)
    dispatch({ type: 'UPDATE_ORDER', payload: order })
  }, [])

  const deleteOrder = useCallback(async (id: string) => {
    // No DELETE endpoint yet — just remove from local state
    dispatch({ type: 'DELETE_ORDER', payload: id })
  }, [])

  // ── Empresas ──────────────────────────────────────────────────────────────
  const loadEmpresas = useCallback(async () => {
    dispatch({ type: 'LOAD_EMPRESAS', payload: await empresasApi.list() })
  }, [])

  const createEmpresa = useCallback(async (data: EmpresaFormData) => {
    const empresa = await empresasApi.create({
      nome: data.nome,
      ativo: data.ativo,
      nrFuncionariosPagos: data.nrFuncionariosPagos,
      maxUsosDia: data.maxUsosDia,
      menuNome: data.menuNome,
      pratoIds: data.pratoIds,
    })
    dispatch({ type: 'ADD_EMPRESA', payload: empresa })
  }, [])

  const updateEmpresa = useCallback(async (id: string, data: Partial<EmpresaFormData>) => {
    const empresa = await empresasApi.update(id, {
      nome: data.nome,
      ativo: data.ativo,
      nrFuncionariosPagos: data.nrFuncionariosPagos,
      maxUsosDia: data.maxUsosDia,
    })
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  const deleteEmpresa = useCallback(async (id: string) => {
    await empresasApi.delete(id)
    dispatch({ type: 'DELETE_EMPRESA', payload: id })
  }, [])

  const regenerateEmpresaCodes = useCallback(async (id: string) => {
    const empresa = await empresasApi.regenerateCodes(id)
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  const toggleEmpresaCode = useCallback(async (empresaId: string, ativo: boolean) => {
    const empresa = await empresasApi.toggleCodigo(empresaId, ativo)
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  const createEmpresaMenu = useCallback(async (empresaId: string, data: EmpresaMenuFormData) => {
    const empresa = await empresasApi.createMenu(empresaId, data)
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  const updateEmpresaMenu = useCallback(async (empresaId: string, menuId: string, data: Partial<EmpresaMenuFormData>) => {
    const empresa = await empresasApi.updateMenu(empresaId, menuId, data)
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  const deleteEmpresaMenu = useCallback(async (empresaId: string, menuId: string) => {
    const empresa = await empresasApi.deleteMenu(empresaId, menuId)
    dispatch({ type: 'UPDATE_EMPRESA', payload: empresa })
  }, [])

  return (
    <AdminContext.Provider value={{
      state,
      loadPratos, createPrato, updatePrato, deletePrato, toggleDisponivel,
      loadExtras, createExtra, updateExtra, deleteExtra,
      loadSchedule, setDayPrato,
      loadOrders, updateOrderStatus, deleteOrder,
      loadEmpresas, createEmpresa, updateEmpresa, deleteEmpresa,
      regenerateEmpresaCodes, toggleEmpresaCode,
      createEmpresaMenu, updateEmpresaMenu, deleteEmpresaMenu,
    }}>
      {children}
    </AdminContext.Provider>
  )
}
