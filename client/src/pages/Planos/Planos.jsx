import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { planosApi, subscricoesApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Spinner, MenuLine } from '../../components/ui'
import styles from './Planos.module.css'

// Número para pagamento manual (M-Pesa / e-Mola).
const PAGAMENTO_NUMERO = '+258 84 123 4567'

const ESTADO_LABEL = {
  pendente_pagamento: 'Aguarda confirmação',
  ativa: 'Ativa',
  expirada: 'Expirada',
  rejeitada: 'Rejeitada',
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
    if (!isAuthenticated) { navigate('/auth'); return }
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
      setSucesso('Subscrição registada. Assim que confirmarmos o pagamento, as refeições ficam disponíveis.')
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

      {/* ── Hero quadro ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>Planos pré-pagos</span>
          <h1 className={styles.heroTitle}>Compra almoços à frente e poupa.</h1>
          <p className={styles.heroSub}>
            Paga por M-Pesa, e-Mola ou transferência, envia o comprovativo e nós
            creditamos as refeições. Sem cartão, sem mensalidade automática.
          </p>
          {subAtiva && (
            <div className={styles.saldo}>
              <span className={styles.saldoNum}>{subAtiva.refeicoesRestantes}</span>
              <span className={styles.saldoTexto}>
                refeições disponíveis · {subAtiva.planoNome}<br />
                válido até {fmtData(subAtiva.dataExpiracao)}
              </span>
            </div>
          )}
        </div>
      </section>

      {authLoading || loading ? (
        <div className={styles.stateBox}><Spinner size="large" /></div>
      ) : (
        <div className={styles.container}>
          {error && <div className={styles.errorBanner}>{error}</div>}
          {sucesso && <div className={styles.okBanner}>{sucesso}</div>}

          {/* ── Tabela de planos ── */}
          <h2 className={styles.sectionTitle}>Tabela de planos</h2>
          {planos.length === 0 ? (
            <p className={styles.empty}>Não há planos disponíveis de momento.</p>
          ) : (
            <div className={styles.tabela}>
              {planos.map((p) => (
                <div key={p._id} className={`${styles.linha} ${p.premium ? styles.linhaPremium : ''}`}>
                  {p.premium && <span className={styles.premiumTab}>Premium</span>}
                  <div className={styles.linhaInfo}>
                    <span className={styles.linhaNome}>{p.nome}</span>
                    <span className={styles.linhaMeta}>
                      {p.numRefeicoes} refeições · válido {p.validadeDias} dias
                      {p.premium ? ' · desbloqueia exclusivos' : ''}
                    </span>
                    {p.descricao && <span className={styles.linhaDesc}>{p.descricao}</span>}
                  </div>
                  <div className={styles.linhaPreco}>
                    <span className={styles.preco}>{p.preco}<span>MT</span></span>
                    <Button
                      variant={p.premium ? 'primary' : 'outline'}
                      size="small"
                      onClick={() => escolher(p)}
                    >
                      {isAuthenticated ? 'Comprar' : 'Entrar para comprar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagamento (recibo) ── */}
          {selecionado && (
            <div className={styles.pagamento}>
              <div className={styles.pagHead}>
                <h2 className={styles.sectionTitle}>Pagamento — {selecionado.nome}</h2>
                <button className={styles.link} onClick={() => setSelecionado(null)}>Cancelar</button>
              </div>
              <ol className={styles.passos}>
                <li><span className={styles.passoN}>1</span> Transfere <strong>{selecionado.preco} MT</strong> por M-Pesa ou e-Mola para <strong>{PAGAMENTO_NUMERO}</strong>.</li>
                <li><span className={styles.passoN}>2</span> Tira foto/print do comprovativo da transação.</li>
                <li><span className={styles.passoN}>3</span> Anexa abaixo e confirma. Creditamos assim que verificarmos.</li>
              </ol>

              <label className={styles.file}>
                <span className={styles.fileLabel}>Comprovativo (imagem)</span>
                <input type="file" accept="image/*" onChange={(e) => setComprovativo(e.target.files?.[0] ?? null)} />
                {comprovativo && <span className={styles.fileName}>{comprovativo.name}</span>}
              </label>

              <Button onClick={submeter} loading={enviando}>Confirmar subscrição</Button>
              <p className={styles.nota}>
                Podes enviar o comprovativo agora ou mais tarde — a subscrição fica registada como pendente.
              </p>
            </div>
          )}

          {/* ── As minhas subscrições ── */}
          {isAuthenticated && subs.length > 0 && (
            <>
              <h2 className={styles.sectionTitle}>As minhas subscrições</h2>
              <div className={styles.subs}>
                {subs.map((s) => (
                  <MenuLine
                    key={s._id}
                    name={s.planoNome}
                    note={s.estado === 'ativa'
                      ? `${s.refeicoesRestantes}/${s.numRefeicoes} refeições · até ${fmtData(s.dataExpiracao)}`
                      : `${s.preco} MT · ${fmtData(s.createdAt)}${s.notaAdmin ? ` · ${s.notaAdmin}` : ''}`}
                    action={
                      <span className={`${styles.estadoTag} ${styles[`estado_${s.estado}`] ?? ''}`}>
                        {ESTADO_LABEL[s.estado]}
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
