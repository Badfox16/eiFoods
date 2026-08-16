import { useAdmin } from '../../context/useAdmin'
import { Header, StatCard, Card } from '../../components'
import { mockStats, mockRevenueData, mockPopularDishes } from '../../data/mockData'
import { formatPrice } from '../../../../shared/utils'
import styles from './Dashboard.module.css'

function IcoPedidos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
      <path d="M16.5 9.4 7.55 4.24"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
      <circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27 22 19"/>
    </svg>
  )
}

function IcoReceita() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  )
}

function IcoPendente() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function IcoPratos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  )
}

export function Dashboard() {
  const { state } = useAdmin()

  const pendingOrders = state.orders.filter(o => o.status === 'pending').length
  const todayOrders = state.orders.length
  const todayRevenue = state.orders.reduce((sum, order) => sum + order.total, 0)

  return (
    <div className={styles.dashboard}>
      <Header
        title="Dashboard"
        subtitle="Visão geral do seu negócio"
      />

      {/* Estatísticas principais */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Pedidos Hoje"
          value={todayOrders}
          icon={<IcoPedidos />}
          trend={{ value: mockStats.ordersChange, label: 'vs ontem' }}
          color="#E2570F"
        />
        <StatCard
          title="Receita Hoje"
          value={formatPrice(todayRevenue)}
          icon={<IcoReceita />}
          trend={{ value: mockStats.revenueChange, label: 'vs ontem' }}
          color="#359420"
        />
        <StatCard
          title="Pedidos Pendentes"
          value={pendingOrders}
          icon={<IcoPendente />}
          color="#B5790C"
        />
        <StatCard
          title="Pratos Disponíveis"
          value={state.pratos.length}
          icon={<IcoPratos />}
          color="#2C5A6B"
        />
      </div>

      {/* Gráfico de receita */}
      <Card className={styles.chartCard}>
        <h2 className={styles.cardTitle}>Receita dos Últimos 7 Dias</h2>
        <div className={styles.chart}>
          {mockRevenueData.map((data, index) => {
            const maxValue = Math.max(...mockRevenueData.map(d => d.value))
            const height = (data.value / maxValue) * 100

            return (
              <div key={index} className={styles.chartBar}>
                <div
                  className={styles.bar}
                  style={{ height: `${height}%` }}
                  title={`${data.date}: ${formatPrice(data.value)}`}
                />
                <span className={styles.chartLabel}>
                  {new Date(data.date).getDate()}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Pratos populares */}
      <Card>
        <h2 className={styles.cardTitle}>Pratos Mais Populares</h2>
        <div className={styles.popularDishes}>
          {mockPopularDishes.map((item, index) => (
            <div key={item.dish._id} className={styles.dishRow}>
              <div className={styles.dishRank}>#{index + 1}</div>
              <img src={item.dish.imagem.url} alt={item.dish.nome} className={styles.dishImagem} />
              <div className={styles.dishInfo}>
                <div className={styles.dishName}>{item.dish.nome}</div>
                <div className={styles.dishMeta}>
                  {item.orders} pedidos · {formatPrice(item.revenue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pedidos recentes */}
      <Card>
        <h2 className={styles.cardTitle}>Pedidos Recentes</h2>
        <div className={styles.recentOrders}>
          {state.orders.slice(0, 5).map(order => (
            <div key={order._id} className={styles.orderRow}>
              <div className={styles.orderInfo}>
                <div className={styles.orderId}>#{order._id.slice(-6).toUpperCase()}</div>
                <div className={styles.orderCustomer}>{order.deliveryDetails.name}</div>
              </div>
              <div className={styles.orderMeta}>
                <div className={styles.orderTotal}>{formatPrice(order.total)}</div>
                <div className={`${styles.orderStatus} ${styles[order.status]}`}>
                  {getStatusLabel(order.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  }
  return labels[status] || status
}
