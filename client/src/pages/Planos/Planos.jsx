import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { planosApi, subscricoesApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Spinner, MenuLine } from '../../components/ui'
import {
  CATEGORIA_LABEL,
  CATEGORIA_DESCRICAO,
  DURACAO_CONFIG,
  DURACAO_ORDEM,
  OBJETIVO_LABEL,
  OBJETIVO_ORDEM,
  OBJETIVO_PARA_CATEGORIA,
} from '../../../../shared/constants'
import styles from './Planos.module.css'

// Número para pagamento manual (M-Pesa / e-Mola).
const PAGAMENTO_NUMERO = '+258 84 123 4567'

const ESTADO_LABEL = {
  pendente_pagamento: 'Aguarda confirmação',
  ativa: 'Ativa',
  expirada: 'Expirada',
  rejeitada: 'Rejeitada',
}

function IconClassico() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  )
}
function IconPremium() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.6-6.3 4.6 2.3-7.2-6-4.6h7.6z" />
    </svg>
  )
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

  // ── Assistente: tipo → objetivo (se Premium) → duração/confirmação ──
  // Os 4 objetivos mapeiam sempre para um subplano premium dedicado (ver
  // OBJETIVO_PARA_CATEGORIA) — nunca caem no Clássico, por isso não há
  // estado de "fallback" a acompanhar aqui.
  const [step, setStep] = useState('tipo') // 'tipo' | 'objetivo' | 'duracao'
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(null)

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

  // ── Navegação do assistente ──
  const escolherClassico = () => {
    setCategoriaEscolhida('classico')
    setStep('duracao')
  }
  const escolherPremium = () => setStep('objetivo')
  const escolherObjetivo = (objetivo) => {
    setCategoriaEscolhida(OBJETIVO_PARA_CATEGORIA[objetivo])
    setStep('duracao')
  }
  const voltar = () => {
    setStep(categoriaEscolhida === 'classico' ? 'tipo' : 'objetivo')
    setSelecionado(null)
  }
  const recomecar = () => {
    setStep('tipo')
    setCategoriaEscolhida(null)
    setSelecionado(null)
  }

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
      recomecar()
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const planosDaCategoria = categoriaEscolhida
    ? planos.filter((p) => p.categoria === categoriaEscolhida)
    : []

  // Clássico ramifica em 3 durações (Starter/Plus/Mensal — ordenadas por
  // DURACAO_ORDEM). Os premium são planos únicos, sem variante de duração —
  // mostramos diretamente o plano da categoria (normalmente 1), sem rótulo
  // de duração.
  const listaDuracao = categoriaEscolhida === 'classico'
    ? DURACAO_ORDEM.map((duracao) => planosDaCategoria.find((p) => p.duracao === duracao)).filter(Boolean)
    : planosDaCategoria

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero quadro ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>Subscrição</span>
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

          {!selecionado && (
            <>
              {step !== 'tipo' && (
                <div className={styles.stepNav}>
                  <button className={styles.voltar} onClick={voltar}>&larr; Voltar</button>
                </div>
              )}

              {/* ── Passo 1: tipo de plano ── */}
              {step === 'tipo' && (
                <>
                  <h2 className={styles.sectionTitle}>Escolhe o teu plano</h2>
                  <div className={styles.tipoGrid}>
                    <button className={styles.tipoCard} onClick={escolherClassico}>
                      <span className={styles.tipoCardIcon}><IconClassico /></span>
                      <span className={styles.tipoCardNome}>{CATEGORIA_LABEL.classico}</span>
                      <span className={styles.tipoCardDesc}>{CATEGORIA_DESCRICAO.classico}</span>
                    </button>
                    <button className={styles.tipoCard} onClick={escolherPremium}>
                      <span className={styles.tipoCardIcon}><IconPremium /></span>
                      <span className={styles.tipoCardNome}>Premium Nutrição</span>
                      <span className={styles.tipoCardDesc}>
                        Cardápio pensado para o teu objetivo — perda de peso, ganho de massa ou equilíbrio.
                      </span>
                    </button>
                  </div>
                </>
              )}

              {/* ── Passo 2 (só Premium): objetivo ── */}
              {step === 'objetivo' && (
                <>
                  <h2 className={styles.sectionTitle}>Qual é o seu objetivo?</h2>
                  <div className={styles.objetivoGrid}>
                    {OBJETIVO_ORDEM.map((obj) => (
                      <button key={obj} className={styles.objetivoBtn} onClick={() => escolherObjetivo(obj)}>
                        {OBJETIVO_LABEL[obj]}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* ── Passo 3: duração (só Clássico) ou confirmação (Premium) ── */}
              {step === 'duracao' && (
                <>
                  <h2 className={styles.sectionTitle}>
                    {categoriaEscolhida === 'classico'
                      ? `${CATEGORIA_LABEL.classico} — escolhe a duração`
                      : `${CATEGORIA_LABEL[categoriaEscolhida]} — confirma o teu plano`}
                  </h2>
                  {listaDuracao.length === 0 ? (
                    <p className={styles.empty}>Não há planos disponíveis nesta categoria de momento.</p>
                  ) : (
                    <div className={styles.tabela}>
                      {listaDuracao.map((p) => (
                        <div key={p._id} className={`${styles.linha} ${p.premium ? styles.linhaPremium : ''}`}>
                          {p.premium && <span className={styles.premiumTab}>Premium</span>}
                          <div className={styles.linhaInfo}>
                            <span className={styles.linhaNome}>
                              {categoriaEscolhida === 'classico' ? DURACAO_CONFIG[p.duracao].label : p.nome}
                            </span>
                            <span className={styles.linhaMeta}>
                              {p.numRefeicoes} refeições · válido {p.validadeDias} dias
                            </span>
                            {p.descricao && <span className={styles.linhaDesc}>{p.descricao}</span>}
                          </div>
                          <div className={styles.linhaPreco}>
                            {p.preco === null ? (
                              <span className={styles.precoConfirmar}>Preço a confirmar</span>
                            ) : (
                              <span className={styles.preco}>
                                {p.preco}<span>MT{p.precoUnidade === 'por_refeicao' ? '/refeição' : ''}</span>
                              </span>
                            )}
                            <Button
                              variant={p.premium ? 'primary' : 'outline'}
                              size="small"
                              disabled={p.preco === null}
                              onClick={() => escolher(p)}
                            >
                              {p.preco === null ? 'Indisponível' : isAuthenticated ? 'Comprar' : 'Entrar para comprar'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
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
