import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { streakApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import styles from './Streak.module.css'

export default function Streak() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let active = true
    streakApi.me()
      .then((data) => { if (active) setInfo(data) })
      .catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isAuthenticated, authLoading])

  const streak = info?.streakAtual ?? 0

  return (
    <div className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.flameWrap} data-ativo={streak > 0}>
          <span className={styles.flame}>🔥</span>
          <span className={styles.flameNum}>{streak}</span>
        </div>
        <h1 className={styles.heroTitle}>
          {streak > 0 ? `${streak} ${streak === 1 ? 'dia' : 'dias'} de sequência` : 'Comece a sua sequência'}
        </h1>
        <p className={styles.heroSub}>
          {streak > 0
            ? 'Peça almoço todos os dias úteis para manter o fogo aceso e desbloquear recompensas.'
            : 'Faça um pedido hoje e comece a acumular dias para ganhar descontos e pratos grátis.'}
        </p>
      </section>

      {authLoading || loading ? (
        <div className={styles.stateBox}><div className={styles.spinner} /></div>
      ) : !isAuthenticated ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Entre com o seu telefone para ver e acumular a sua sequência.</p>
          <button className={styles.primaryBtn} onClick={() => navigate('/auth')}>Entrar</button>
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <span className={styles.stateIcon}>⚠️</span>
          <p className={styles.stateText}>Não foi possível carregar a sua sequência</p>
          <p className={styles.stateSub}>{error}</p>
        </div>
      ) : (
        <div className={styles.container}>
          {/* Resumo */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Desconto atual</span>
              <span className={styles.summaryValue}>
                {info.descontoAtual > 0 ? `${info.descontoAtual}%` : '—'}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Melhor sequência</span>
              <span className={styles.summaryValue}>{info.maiorStreak} {info.maiorStreak === 1 ? 'dia' : 'dias'}</span>
            </div>
          </div>

          {/* Próxima recompensa */}
          {info.proximaRecompensa && (
            <div className={styles.nextCard}>
              <div className={styles.nextHeader}>
                <span className={styles.nextLabel}>Próxima recompensa</span>
                <span className={styles.nextDays}>
                  faltam {Math.max(0, info.proximaRecompensa.dias - streak)} {Math.max(0, info.proximaRecompensa.dias - streak) === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <p className={styles.nextDesc}>{info.proximaRecompensa.descricao}</p>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressBar}
                  style={{ width: `${Math.min(100, (streak / info.proximaRecompensa.dias) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Escada de recompensas */}
          <h2 className={styles.sectionTitle}>Recompensas</h2>
          <ul className={styles.ladder}>
            {info.tiers.map((tier) => {
              const conquistado = streak >= tier.dias
              const proximo = info.proximaRecompensa?.dias === tier.dias
              return (
                <li
                  key={tier.dias}
                  className={`${styles.tier} ${conquistado ? styles.tierDone : ''} ${proximo ? styles.tierNext : ''}`}
                >
                  <div className={styles.tierBadge}>
                    {conquistado ? '✓' : tier.dias}
                    {!conquistado && <span className={styles.tierBadgeUnit}>dias</span>}
                  </div>
                  <div className={styles.tierInfo}>
                    <span className={styles.tierDesc}>{tier.descricao}</span>
                    <span className={styles.tierMeta}>
                      {tier.tipo === 'desconto' ? `${tier.dias} dias · desconto` : `${tier.dias} dias · prémio`}
                    </span>
                  </div>
                  <span className={`${styles.tierIcon} ${tier.tipo === 'item_gratis' ? styles.tierIconGift : ''}`}>
                    {tier.tipo === 'item_gratis' ? '🎁' : '%'}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Prémios ganhos */}
          {info.recompensasGanhas?.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>Prémios ganhos</h2>
              <ul className={styles.wonList}>
                {info.recompensasGanhas.map((r, i) => (
                  <li key={r._id ?? i} className={styles.wonItem}>
                    <span className={styles.wonIcon}>🎁</span>
                    <div className={styles.wonInfo}>
                      <span className={styles.wonDesc}>{r.descricao}</span>
                      <span className={styles.wonDate}>
                        {new Date(r.ganhoEm).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                    <span className={`${styles.wonStatus} ${r.cumprida ? styles.wonStatusOk : ''}`}>
                      {r.cumprida ? 'Entregue' : 'Por resgatar'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  )
}
