import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { streakApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Spinner, Stamp, MenuLine } from '../../components/ui'
import styles from './Streak.module.css'

function recompensaCurta(tier) {
  return tier.tipo === 'item_gratis' ? 'prémio' : 'desc.'
}

export default function Streak() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    let active = true
    streakApi.me()
      .then((data) => { if (active) setInfo(data) })
      .catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [isAuthenticated, authLoading])

  // Estado de carregamento derivado (evita setState síncrono no effect).
  const loading = authLoading || (isAuthenticated && !info && !error)

  const streak = info?.streakAtual ?? 0
  const tiers = info?.tiers ?? []
  const maxDias = tiers.reduce((m, t) => Math.max(m, t.dias), 0)
  const milestones = new Map(tiers.map((t) => [t.dias, t]))
  const dias = maxDias ? Array.from({ length: maxDias }, (_, i) => i + 1) : []
  const faltam = info?.proximaRecompensa ? Math.max(0, info.proximaRecompensa.dias - streak) : null

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero: quadro do cartão ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>O seu cartão</span>
          <div className={styles.heroCount}>
            <span className={styles.heroNum}>{streak}</span>
            <span className={styles.heroUnit}>{streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          </div>
          <p className={styles.heroSub}>
            {streak > 0
              ? 'Peça em cada dia útil para não perder o cartão. Domingo não conta.'
              : 'Faça um pedido num dia útil para carimbar o primeiro selo.'}
          </p>
        </div>
      </section>

      {authLoading || loading ? (
        <div className={styles.stateBox}><Spinner size="large" /></div>
      ) : !isAuthenticated ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Entre com o seu telefone para ver e carimbar o seu cartão.</p>
          <Button onClick={() => navigate('/auth')}>Entrar</Button>
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Não foi possível carregar o seu cartão.</p>
          <p className={styles.stateSub}>{error}</p>
        </div>
      ) : (
        <div className={styles.container}>
          {/* Resumo em duas linhas de talão */}
          <div className={styles.resumo}>
            <MenuLine name="Desconto atual" price={info.descontoAtual > 0 ? info.descontoAtual : '0'} unit="%" />
            <MenuLine name="Melhor cartão" price={info.maiorStreak} unit={info.maiorStreak === 1 ? 'dia' : 'dias'} />
          </div>

          {/* Próxima recompensa */}
          {info.proximaRecompensa && (
            <div className={styles.next}>
              <div className={styles.nextTop}>
                <span className={styles.nextLabel}>Próxima recompensa</span>
                <span className={styles.nextDays}>{faltam === 0 ? 'hoje' : `faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</span>
              </div>
              <p className={styles.nextDesc}>{info.proximaRecompensa.descricao}</p>
              <div className={styles.track}>
                <div className={styles.trackFill} style={{ width: `${Math.min(100, (streak / info.proximaRecompensa.dias) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Cartão de selos */}
          <h2 className={styles.sectionTitle}>O cartão</h2>
          <div className={styles.card}>
            {dias.map((d) => {
              const tier = milestones.get(d)
              const earned = d <= streak
              const state = tier
                ? (earned ? 'milestoneEarned' : 'milestone')
                : (earned ? 'earned' : 'empty')
              return (
                <Stamp
                  key={d}
                  state={state}
                  label={d}
                  reward={tier ? recompensaCurta(tier) : undefined}
                  today={d === streak && streak > 0}
                />
              )
            })}
          </div>

          {/* Prémios ganhos */}
          {info.recompensasGanhas?.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>Prémios ganhos</h2>
              <div className={styles.ganhos}>
                {info.recompensasGanhas.map((r, i) => (
                  <MenuLine
                    key={r._id ?? i}
                    name={r.descricao}
                    note={new Date(r.ganhoEm).toLocaleDateString('pt-PT')}
                    action={
                      <span className={`${styles.estado} ${r.cumprida ? styles.estadoOk : ''}`}>
                        {r.cumprida ? 'Entregue' : 'Por resgatar'}
                      </span>
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  )
}
