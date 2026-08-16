import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { planosApi, subscricoesApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import styles from './Planos.module.css'

// Número para pagamento manual (M-Pesa / e-Mola). Mesmo contacto do rodapé.
const PAGAMENTO_NUMERO = '+258 84 123 4567'

const ESTADO_LABEL = {
  pendente_pagamento: 'Aguarda confirmação',
  ativa: 'Ativa',
  expirada: 'Expirada',
  rejeitada: 'Rejeitada',
}

function fmtMzn(v) {
  return `${Number(v).toLocaleString('pt-PT')} MT`
}
function fmtData(d) {
  return d ? new Date(d).toLocaleDateString('pt-PT') : '—'
}

export default function Planos() {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading } = useAuth()

  const [planos, setPlanos] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selecionado, setSelecionado] = useState(null)
  const [comprovativo, setComprovativo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listaPlanos, minhas] = await Promise.all([
        planosApi.list(),
        isAuthenticated ? subscricoesApi.me() : Promise.resolve([]),
      ])
      setPlanos(listaPlanos)
      setSubs(minhas)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    void load()
  }, [authLoading, load])

  const subAtiva = subs.find((s) => s.estado === 'ativa' && s.refeicoesRestantes > 0)

  const escolher = (plano) => {
    if (!isAuthenticated) {
      navigate('/auth')
      return
    }
    setSelecionado(plano)
    setComprovativo(null)
    setSucesso(null)
    setError(null)
  }

  const submeter = async () => {
    if (!selecionado) return
    setEnviando(true)
    setError(null)
    try {
      await subscricoesApi.create({ planoId: selecionado._id, comprovativo })
      setSucesso('Subscrição registada! Assim que confirmarmos o pagamento, as refeições ficam disponíveis.')
      setSelecionado(null)
      setComprovativo(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Planos pré-pagos</h1>
        <p className={styles.heroSub}>
          Compre um pacote de almoços com antecedência e poupe. Pague por M-Pesa ou e-Mola,
          envie o comprovativo e nós ativamos as suas refeições.
        </p>
        {subAtiva && (
          <div className={styles.saldoBanner}>
            <span className={styles.saldoNum}>{subAtiva.refeicoesRestantes}</span>
            <div>
              <strong>refeições disponíveis</strong>
              <span className={styles.saldoSub}>
                {subAtiva.planoNome} · válido até {fmtData(subAtiva.dataExpiracao)}
              </span>
            </div>
          </div>
        )}
      </section>

      {authLoading || loading ? (
        <div className={styles.stateBox}><div className={styles.spinner} /></div>
      ) : (
        <div className={styles.container}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {sucesso && <div className={styles.okBanner}>{sucesso}</div>}

          {/* ── Planos disponíveis ── */}
          <h2 className={styles.sectionTitle}>Escolha um plano</h2>
          {planos.length === 0 ? (
            <p className={styles.empty}>Não há planos disponíveis de momento.</p>
          ) : (
            <div className={styles.planGrid}>
              {planos.map((p) => (
                <div
                  key={p._id}
                  className={`${styles.planCard} ${selecionado?._id === p._id ? styles.planCardActive : ''}`}
                >
                  <span className={styles.planTipo}>{p.tipo}</span>
                  <h3 className={styles.planNome}>{p.nome}</h3>
                  <div className={styles.planPreco}>{fmtMzn(p.preco)}</div>
                  <ul className={styles.planFeats}>
                    <li><strong>{p.numRefeicoes}</strong> refeições</li>
                    <li>Válido {p.validadeDias} dias após ativação</li>
                    {p.descricao && <li>{p.descricao}</li>}
                  </ul>
                  <button className={styles.planBtn} onClick={() => escolher(p)}>
                    {isAuthenticated ? 'Comprar' : 'Entrar para comprar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Fluxo de pagamento ── */}
          {selecionado && (
            <div className={styles.payPanel}>
              <div className={styles.payHead}>
                <h2 className={styles.sectionTitle}>Pagamento — {selecionado.nome}</h2>
                <button className={styles.linkBtn} onClick={() => setSelecionado(null)}>Cancelar</button>
              </div>
              <ol className={styles.paySteps}>
                <li>Transfira <strong>{fmtMzn(selecionado.preco)}</strong> por M-Pesa ou e-Mola para <strong>{PAGAMENTO_NUMERO}</strong>.</li>
                <li>Tire um print/foto do comprovativo da transação.</li>
                <li>Anexe o comprovativo abaixo e confirme. Ativamos assim que verificarmos.</li>
              </ol>

              <label className={styles.fileField}>
                <span>Comprovativo (imagem)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setComprovativo(e.target.files?.[0] ?? null)}
                />
                {comprovativo && <span className={styles.fileName}>{comprovativo.name}</span>}
              </label>

              <button className={styles.payBtn} onClick={submeter} disabled={enviando}>
                {enviando ? 'A enviar...' : 'Confirmar subscrição'}
              </button>
              <p className={styles.payNote}>
                Pode enviar o comprovativo agora ou mais tarde — a subscrição fica registada como pendente.
              </p>
            </div>
          )}

          {/* ── As minhas subscrições ── */}
          {isAuthenticated && subs.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>As minhas subscrições</h2>
              <ul className={styles.subList}>
                {subs.map((s) => (
                  <li key={s._id} className={styles.subItem}>
                    <div className={styles.subInfo}>
                      <span className={styles.subNome}>{s.planoNome}</span>
                      <span className={styles.subMeta}>
                        {s.estado === 'ativa'
                          ? `${s.refeicoesRestantes}/${s.numRefeicoes} refeições · até ${fmtData(s.dataExpiracao)}`
                          : `${fmtMzn(s.preco)} · ${fmtData(s.createdAt)}`}
                      </span>
                      {s.notaAdmin && <span className={styles.subNota}>{s.notaAdmin}</span>}
                    </div>
                    <span className={`${styles.subEstado} ${styles[`estado_${s.estado}`] ?? ''}`}>
                      {ESTADO_LABEL[s.estado]}
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
