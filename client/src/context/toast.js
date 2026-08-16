import { createContext, useContext } from 'react'

/**
 * Contexto e hook do sistema de toasts, separados do componente `ToastProvider`
 * (em ToastContext.jsx) para satisfazer a regra react-refresh/only-export-components:
 * um ficheiro de componentes não deve exportar também valores/hooks.
 */
export const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
