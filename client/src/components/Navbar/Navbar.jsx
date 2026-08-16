import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import { useAuth } from '../../context/useAuth'
import { Button } from '../ui'
import styles from './Navbar.module.css'

const LINKS = [
  { to: '/', label: 'Início', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/planos', label: 'Planos' },
  { to: '/sorteio', label: 'Sorteio' },
]

export default function Navbar({ showCta = false }) {
  const navigate = useNavigate()
  const { state } = useOrder()
  const { isAuthenticated, cliente, premium, logout } = useAuth()
  const totalItens = state.orderItems.reduce((acc, item) => acc + Math.max(1, item.quantity ?? 1), 0)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [menuAberto])

  function irPara(rota) {
    navigate(rota)
    setMenuAberto(false)
  }

  const linkClass = ({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`

  return (
    <>
      <header className={styles.header}>
        <button className={styles.wordmark} onClick={() => irPara('/')} aria-label="Ir para o início">
          <span className={styles.wordmarkMark} aria-hidden="true" />
          <span className={styles.wordmarkText}>eiFoods</span>
        </button>

        <nav className={styles.navDesktop}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <NavLink to="/streak" className={linkClass}>Sequência</NavLink>
          )}
        </nav>

        <div className={styles.rightSection}>
          {isAuthenticated ? (
            <div className={styles.account}>
              <span className={styles.accountName}>
                {premium && <span className={styles.crown} title="Cliente premium">PREMIUM</span>}
                {cliente?.nome || 'Conta'}
              </span>
              <button className={styles.textBtn} onClick={() => { logout(); setMenuAberto(false) }}>
                Sair
              </button>
            </div>
          ) : (
            <button className={styles.textBtn} onClick={() => irPara('/auth')}>
              Entrar
            </button>
          )}

          {showCta ? (
            <span className={styles.ctaWrap}>
              <Button variant="primary" size="small" onClick={() => irPara('/menu')}>
                Encomendar
              </Button>
            </span>
          ) : (
            <button
              className={styles.cartBtn}
              onClick={() => irPara('/order-summary')}
              aria-label={`Ver carrinho${totalItens > 0 ? ` (${totalItens} itens)` : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {totalItens > 0 && <span className={styles.badge}>{totalItens}</span>}
            </button>
          )}

          <button
            className={`${styles.hamburger} ${menuAberto ? styles.hamburgerAberto : ''}`}
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {menuAberto && (
        <>
          <div className={styles.overlay} onClick={() => setMenuAberto(false)} />
          <nav className={styles.navMobile}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `${styles.navMobileItem} ${isActive ? styles.navMobileItemActive : ''}`}
                onClick={() => setMenuAberto(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {isAuthenticated && (
              <NavLink
                to="/streak"
                className={({ isActive }) => `${styles.navMobileItem} ${isActive ? styles.navMobileItemActive : ''}`}
                onClick={() => setMenuAberto(false)}
              >
                Sequência
              </NavLink>
            )}

            <div className={styles.navMobileDivider} />

            {isAuthenticated ? (
              <button className={styles.navMobileItem} onClick={() => { logout(); setMenuAberto(false) }}>
                Sair{cliente?.nome ? ` · ${cliente.nome}` : ''}
              </button>
            ) : (
              <button className={styles.navMobileItem} onClick={() => irPara('/auth')}>
                Entrar
              </button>
            )}

            {showCta ? (
              <button className={styles.navMobileCta} onClick={() => irPara('/menu')}>
                Encomendar
              </button>
            ) : totalItens > 0 && (
              <button className={styles.navMobileItem} onClick={() => irPara('/order-summary')}>
                Carrinho ({totalItens})
              </button>
            )}
          </nav>
        </>
      )}
    </>
  )
}
