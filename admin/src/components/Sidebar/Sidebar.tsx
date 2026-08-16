import { NavLink } from 'react-router-dom'
import { CalendarDays, Flame, Wallet } from 'lucide-react'
import styles from './Sidebar.module.css'

function IcoMenuDia() {
  return <CalendarDays size={17} strokeWidth={2} />
}

function IcoStreak() {
  return <Flame size={17} strokeWidth={2} />
}

function IcoPlanos() {
  return <Wallet size={17} strokeWidth={2} />
}

function IcoDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}

function IcoPratos() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  )
}

function IcoPedidos() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function IcoExtras() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}

function IcoEmpresas() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18"/>
      <path d="M5 21V7l7-4 7 4v14"/>
      <path d="M9 10h6"/>
      <path d="M9 14h6"/>
    </svg>
  )
}

function IcoPratoDoDia() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function IcoSorteio() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="18" width="12" height="4"/>
    </svg>
  )
}

function IcoConfiguracoes() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

const navGroups = [
  {
    label: 'Geral',
    items: [
      { path: '/',       label: 'Dashboard', icon: <IcoDashboard />, end: true },
      { path: '/orders', label: 'Pedidos',   icon: <IcoPedidos /> },
    ]
  },
  {
    label: 'Cardápio',
    items: [
      { path: '/dishes',       label: 'Pratos',      icon: <IcoPratos /> },
      { path: '/extras',       label: 'Extras',       icon: <IcoExtras /> },
      { path: '/empresas',     label: 'Empresas',     icon: <IcoEmpresas /> },
      { path: '/menu-dia',     label: 'Menu do Dia',  icon: <IcoMenuDia /> },
      { path: '/prato-do-dia', label: 'Prato do Dia (legado)', icon: <IcoPratoDoDia /> },
    ]
  },
  {
    label: 'Promoções',
    items: [
      { path: '/sorteio', label: 'Sorteio', icon: <IcoSorteio /> },
      { path: '/streak',  label: 'Sequência', icon: <IcoStreak /> },
      { path: '/planos',  label: 'Planos', icon: <IcoPlanos /> },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { path: '/settings', label: 'Configurações', icon: <IcoConfiguracoes /> },
    ]
  },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/logo.jpg" alt="Marmita Fresca" className={styles.logoImg} />
        <span className={styles.logoLabel}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {navGroups.map(group => (
          <div key={group.label} className={styles.navGroup}>
            <p className={styles.navGroupLabel}>{group.label}</p>
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userAvatar}>A</div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>Admin</div>
          <div className={styles.userEmail}>admin@marmitafresca.mz</div>
        </div>
      </div>
    </aside>
  )
}
