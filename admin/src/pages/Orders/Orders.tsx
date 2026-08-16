import { useState } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card, Button, Badge } from '../../components'
import { formatPrice } from '../../../../shared/utils'
import type { ApiOrder } from '../../lib/api'
import type { OrderStatus } from '../../types/admin.types'
import styles from './Orders.module.css'

interface GroupedOrderItem {
  key: string
  quantidade: number
  pratoNome: string
  free: string[]
  salt: string
  extras: string[]
  unitPrice: number
  totalPrice: number
}

function IcoUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IcoBuilding() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
    </svg>
  )
}

function IcoPin() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IcoPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.52 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.72a16 16 0 0 0 6 6l1.21-1.21a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}

function IcoCaixaVazia() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ui-text-3)' }}>
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
      <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  )
}

export function Orders() {
  const { state, updateOrderStatus } = useAdmin()
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all')
  
  const filteredOrders = selectedStatus === 'all'
    ? state.orders
    : state.orders.filter(o => o.status === selectedStatus)
  
  const statusCounts = {
    all: state.orders.length,
    pending: state.orders.filter(o => o.status === 'pending').length,
    preparing: state.orders.filter(o => o.status === 'preparing').length,
    ready: state.orders.filter(o => o.status === 'ready').length,
    delivered: state.orders.filter(o => o.status === 'delivered').length
  }

  function groupOrderItems(order: ApiOrder): GroupedOrderItem[] {
    const map = new Map<string, GroupedOrderItem>()

    for (const item of order.items) {
      const free = item.customizations?.free ?? []
      const salt = item.customizations?.salt ?? 'Normal'
      const extras = item.extras.map((e) => e.nome)
      const key = JSON.stringify({
        pratoNome: item.pratoNome,
        free,
        salt,
        extras,
        unitPrice: item.total,
      })

      const existing = map.get(key)
      if (existing) {
        existing.quantidade += 1
        existing.totalPrice += item.total
      } else {
        map.set(key, {
          key,
          quantidade: 1,
          pratoNome: item.pratoNome,
          free,
          salt,
          extras,
          unitPrice: item.total,
          totalPrice: item.total,
        })
      }
    }

    return Array.from(map.values())
  }
  
  return (
    <div className={styles.orders}>
      <Header 
        title="Gestão de Pedidos" 
        subtitle={`${state.orders.length} pedidos no total`}
      />
      
      {/* Filtros de status */}
      <Card className={styles.filtersCard}>
        <div className={styles.filters}>
          <FilterButton
            label="Todos"
            count={statusCounts.all}
            active={selectedStatus === 'all'}
            onClick={() => setSelectedStatus('all')}
          />
          <FilterButton
            label="Pendente"
            count={statusCounts.pending}
            active={selectedStatus === 'pending'}
            onClick={() => setSelectedStatus('pending')}
            variant="warning"
          />
          <FilterButton
            label="Preparando"
            count={statusCounts.preparing}
            active={selectedStatus === 'preparing'}
            onClick={() => setSelectedStatus('preparing')}
            variant="info"
          />
          <FilterButton
            label="Pronto"
            count={statusCounts.ready}
            active={selectedStatus === 'ready'}
            onClick={() => setSelectedStatus('ready')}
            variant="success"
          />
          <FilterButton
            label="Entregue"
            count={statusCounts.delivered}
            active={selectedStatus === 'delivered'}
            onClick={() => setSelectedStatus('delivered')}
            variant="default"
          />
        </div>
      </Card>
      
      {/* Lista de pedidos */}
      <div className={styles.ordersList}>
        {filteredOrders.map(order => (
          (() => {
            const groupedItems = groupOrderItems(order)
            const totalItens = groupedItems.reduce((acc, item) => acc + item.quantidade, 0)

            return (
          <Card 
            key={order._id} 
            className={styles.orderCard}
            hover
          >
            <div className={styles.orderHeader}>
              <div className={styles.orderHeaderLeft}>
                <div className={styles.orderId}>#{order._id.slice(-6).toUpperCase()}</div>
                <Badge variant={getStatusVariant(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <div className={styles.orderTotal}>
                {formatPrice(order.total)}
              </div>
            </div>
            
            <div className={styles.orderBody}>
              <div className={styles.orderInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><IcoUser /></span>
                  <span className={styles.infoValue}>{order.deliveryDetails.name}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><IcoBuilding /></span>
                  <span className={styles.infoValue}>{order.deliveryDetails.company}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><IcoPin /></span>
                  <span className={styles.infoValue}>{order.deliveryDetails.location}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><IcoPhone /></span>
                  <span className={styles.infoValue}>{order.deliveryDetails.contact}</span>
                </div>
              </div>
              
              <div className={styles.orderItems}>
                <div className={styles.itemsTitle}>Itens ({totalItens})</div>
                {groupedItems.map((item) => (
                  <div key={item.key} className={styles.orderItem}>
                    <div className={styles.itemDetails}>
                      <div className={styles.itemNameRow}>
                        <div className={styles.itemName}>{item.pratoNome}</div>
                        {item.quantidade > 1 && (
                          <span className={styles.itemQuantidade}>{item.quantidade}x</span>
                        )}
                      </div>

                      <div className={styles.itemCustomizations}>
                        {item.free.length > 0 && (
                          <div>Gratis: {item.free.join(', ')}</div>
                        )}
                        <div>Sal: {item.salt}</div>
                        {item.extras.length > 0 && (
                          <div>Extras: {item.extras.join(', ')}</div>
                        )}
                      </div>
                      {item.quantidade > 1 && (
                        <div className={styles.itemUnitPrice}>Unitário: {formatPrice(item.unitPrice)}</div>
                      )}
                    </div>
                    <div className={styles.itemPrice}>{formatPrice(item.totalPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className={styles.orderFooter}>
              <div className={styles.orderTime}>
                {formatDateTime(new Date(order.createdAt))}
              </div>
              <div className={styles.orderActions}>
                <StatusButton
                  order={order}
                  onStatusChange={(status) => { updateOrderStatus(order._id, status) }}
                />
              </div>
            </div>
          </Card>
            )
          })()
        ))}
      </div>
      
      {filteredOrders.length === 0 && (
        <Card className={styles.emptyState}>
          <div className={styles.emptyIcon}><IcoCaixaVazia /></div>
          <h3 className={styles.emptyTitle}>Nenhum pedido encontrado</h3>
          <p className={styles.emptyText}>
            {selectedStatus === 'all' 
              ? 'Ainda não há pedidos' 
              : `Não há pedidos com status "${getStatusLabel(selectedStatus as OrderStatus)}"`}
          </p>
        </Card>
      )}
    </div>
  )
}

// Componente de botão de filtro
interface FilterButtonProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

function FilterButton({ label, count, active, onClick, variant = 'default' }: FilterButtonProps) {
  return (
    <button
      className={`${styles.filterButton} ${active ? styles.activeFilter : ''}`}
      onClick={onClick}
    >
      <span className={styles.filterLabel}>{label}</span>
      <Badge variant={variant} size="small">{count}</Badge>
    </button>
  )
}

// Componente de botão de status
interface StatusButtonProps {
  order: ApiOrder
  onStatusChange: (status: OrderStatus) => void
}

function StatusButton({ order, onStatusChange }: StatusButtonProps) {
  const statusFlow: Record<OrderStatus, OrderStatus | null> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'delivered',
    delivered: null,
    cancelled: null
  }
  
  const nextStatus = statusFlow[order.status]
  
  if (!nextStatus) return null
  
  return (
    <Button
      size="small"
      variant={nextStatus === 'delivered' ? 'success' : 'primary'}
      onClick={(e) => {
        e.stopPropagation()
        onStatusChange(nextStatus)
      }}
    >
      {getStatusActionLabel(nextStatus)}
    </Button>
  )
}

// Funções auxiliares
function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  }
  return labels[status]
}

function getStatusVariant(status: OrderStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  const variants: Record<OrderStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    preparing: 'info',
    ready: 'success',
    delivered: 'default',
    cancelled: 'danger'
  }
  return variants[status]
}

function getStatusActionLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Iniciar Preparo',
    preparing: 'Marcar como Pronto',
    ready: 'Marcar como Entregue',
    delivered: '',
    cancelled: ''
  }
  return labels[status]
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
