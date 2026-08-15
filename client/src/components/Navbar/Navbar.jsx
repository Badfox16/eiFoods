import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import { useAuth } from '../../context/useAuth'
import styles from './Navbar.module.css'

export default function Navbar({ showCta = false }) {
  const navigate = useNavigate()
  const { state } = useOrder()
  const { isAuthenticated, cliente, logout } = useAuth()
  const totalItens = state.orderItems.reduce((acc, item) => acc + Math.max(1, item.quantity ?? 1), 0)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [menuAberto])

  function handleNavegar(rota) {
    navigate(rota)
    setMenuAberto(false)
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.logo} onClick={() => handleNavegar('/')}>
          <img src="/logo.jpg" alt="Marmita Fresca" className={styles.logoImg} />
        </div>

        <nav className={styles.navDesktop}>
          <span onClick={() => navigate('/')}>Início</span>
          {/* empresa em standby — link removido do fluxo principal
          <span onClick={() => navigate('/empresa')}>Empresa</span> */}
          <span onClick={() => navigate('/menu')}>Menu</span>
          <span onClick={() => navigate('/sorteio')}>Sorteio</span>
          {isAuthenticated && <span onClick={() => navigate('/streak')}>Sequência 🔥</span>}
          {isAuthenticated
            ? <span onClick={() => logout()}>Sair</span>
            : <span onClick={() => navigate('/auth')}>Entrar</span>}
        </nav>

        <div className={styles.rightSection}>
          <button
            className={`${styles.hamburger} ${menuAberto ? styles.hamburgerAberto : ''}`}
            onClick={() => setMenuAberto(!menuAberto)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {showCta ? (
            <button className={styles.ctaBtn} onClick={() => handleNavegar('/menu')}>
              Encomendar agora
            </button>
          ) : (
            <button
              className={styles.cartBtn}
              onClick={() => handleNavegar('/order-summary')}
              aria-label="Ver carrinho"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {totalItens > 0 && (
                <span className={styles.badge}>{totalItens}</span>
              )}
            </button>
          )}
        </div>
      </header>

      {menuAberto && (
        <>
          <div className={styles.overlay} onClick={() => setMenuAberto(false)} />
          <nav className={styles.navMobile}>
            <span onClick={() => handleNavegar('/')}>Início</span>
            {/* empresa em standby — link removido do fluxo principal
            <span onClick={() => handleNavegar('/empresa')}>Empresa</span> */}
            <span onClick={() => handleNavegar('/menu')}>Menu</span>
            <span onClick={() => handleNavegar('/sorteio')}>Sorteio</span>
            {isAuthenticated && <span onClick={() => handleNavegar('/streak')}>Sequência 🔥</span>}
            {isAuthenticated
              ? <span onClick={() => { logout(); setMenuAberto(false) }}>Sair{cliente?.nome ? ` (${cliente.nome})` : ''}</span>
              : <span onClick={() => handleNavegar('/auth')}>Entrar</span>}
            {showCta && (
              <span className={styles.navMobileCta} onClick={() => handleNavegar('/menu')}>
                Encomendar agora
              </span>
            )}
            {!showCta && totalItens > 0 && (
              <span onClick={() => handleNavegar('/order-summary')}>
                Carrinho ({totalItens})
              </span>
            )}
          </nav>
        </>
      )}
    </>
  )
}
