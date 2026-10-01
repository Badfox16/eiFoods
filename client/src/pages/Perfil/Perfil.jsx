import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/toast'
import { subscricoesApi, streakApi } from '../../api'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Input, Card, Badge, Spinner, MenuLine } from '../../components/ui'
import { CATEGORIA_LABEL } from '../../../../shared/constants'
import styles from './Perfil.module.css'

function fmtData(d) {
  return d ? new Date(d).toLocaleDateString('pt-PT') : '—'
}
function fmtTelefone(t) {
  // 258841234567 → +258 84 123 4567
  if (!t || t.length !== 12) return t ?? '—'
  return `+${t.slice(0, 3)} ${t.slice(3, 5)} ${t.slice(5, 8)} ${t.slice(8)}`
}
function iniciais(nome) {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

export default function Perfil() {
  const navigate = useNavigate()
  const { cliente, isAuthenticated, loading: authLoading, premium, categoriaAtiva, updateNome, logout } = useAuth()
  const { showToast } = useToast()

  const [subs, setSubs] = useState([])
  const [streak, setStreak] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editando, setEditando] = useState(false)
  const [nomeForm, setNomeForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [erroNome, setErroNome] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [minhas, streakInfo] = await Promise.all([subscricoesApi.me(), streakApi.me()])
      setSubs(minhas)
      setStreak(streakInfo)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    void load()
  }, [authLoading, isAuthenticated, load])

  function iniciarEdicao() {
    setNomeForm(cliente?.nome ?? '')
    setErroNome('')
    setEditando(true)
  }

  async function guardarNome(e) {
    e.preventDefault()
    if (nomeForm.trim().length < 2) {
      setErroNome('O nome deve ter pelo menos 2 caracteres')
      return
    }
    setGuardando(true)
    setErroNome('')
    try {
      await updateNome(nomeForm.trim())
      setEditando(false)
      showToast('Nome atualizado.', 'success')
    } catch (e) {
      setErroNome(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  const subAtiva = subs.find((s) => s.estado === 'ativa' && s.refeicoesRestantes > 0)
  const subPendente = subs.find((s) => s.estado === 'pendente_pagamento')

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero: identidade ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.avatar}>{iniciais(cliente?.nome)}</span>
          <div className={styles.heroText}>
            <span className={styles.kicker}>O meu perfil</span>
            <h1 className={styles.heroTitulo}>{cliente?.nome || 'Sem nome'}</h1>
            <p className={styles.heroSub}>{fmtTelefone(cliente?.telefone)}</p>
            {premium && (
              <span className={styles.premiumBadge}>
                👑 Premium{categoriaAtiva ? ` · ${CATEGORIA_LABEL[categoriaAtiva]}` : ''}
              </span>
            )}
          </div>
        </div>
      </section>

      {authLoading ? (
        <div className={styles.stateBox}><Spinner size="large" /></div>
      ) : !isAuthenticated ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Entra com o teu telefone para ver o teu perfil.</p>
          <Button onClick={() => navigate('/auth')}>Entrar</Button>
        </div>
      ) : (
        <div className={styles.container}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* ── Dados da conta ── */}
          <h2 className={styles.sectionTitle}>Dados da conta</h2>
          <Card className={styles.card}>
            {editando ? (
              <form className={styles.formNome} onSubmit={guardarNome}>
                <Input
                  label="Nome"
                  value={nomeForm}
                  onChange={(e) => setNomeForm(e.target.value)}
                  error={erroNome}
                  autoFocus
                />
                <div className={styles.formAcoes}>
                  <Button type="submit" size="small" loading={guardando}>Guardar</Button>
                  <Button type="button" variant="ghost" size="small" onClick={() => setEditando(false)}>Cancelar</Button>
                </div>
              </form>
            ) : (
              <div className={styles.linhaConta}>
                <div>
                  <span className={styles.campoLabel}>Nome</span>
                  <span className={styles.campoValor}>{cliente?.nome || 'Sem nome definido'}</span>
                </div>
                <button className={styles.link} onClick={iniciarEdicao}>Editar</button>
              </div>
            )}
            <div className={styles.linhaConta}>
              <div>
                <span className={styles.campoLabel}>Telefone</span>
                <span className={styles.campoValor}>{fmtTelefone(cliente?.telefone)}</span>
              </div>
              <span className={styles.campoNota}>identidade da conta</span>
            </div>
            <div className={styles.linhaConta}>
              <div>
                <span className={styles.campoLabel}>Membro desde</span>
                <span className={styles.campoValor}>{fmtData(cliente?.createdAt)}</span>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className={styles.stateBoxInline}><Spinner /></div>
          ) : (
            <>
              {/* ── O meu plano ── */}
              <h2 className={styles.sectionTitle}>O meu plano</h2>
              {subAtiva ? (
                <Card className={`${styles.card} ${styles.planoCard}`}>
                  <div className={styles.planoHead}>
                    <div>
                      <span className={styles.planoNome}>{subAtiva.planoNome}</span>
                      <span className={styles.planoValidade}>válido até {fmtData(subAtiva.dataExpiracao)}</span>
                    </div>
                    {subAtiva.premium && <Badge variant="solidPiri">Premium</Badge>}
                  </div>
                  <div className={styles.saldoBox}>
                    <span className={styles.saldoNum}>{subAtiva.refeicoesRestantes}</span>
                    <span className={styles.saldoTexto}>de {subAtiva.numRefeicoes} refeições por usar</span>
                  </div>
                  <Button variant="outline" size="small" onClick={() => navigate('/planos')}>Ver todos os planos</Button>
                </Card>
              ) : (
                <Card className={styles.card}>
                  <p className={styles.vazioTexto}>
                    {subPendente
                      ? 'Tens uma subscrição a aguardar confirmação de pagamento.'
                      : 'Ainda não tens nenhum plano ativo.'}
                  </p>
                  <Button size="small" onClick={() => navigate('/planos')}>
                    {subPendente ? 'Ver estado da subscrição' : 'Ver planos'}
                  </Button>
                </Card>
              )}

              {/* ── Sequência ── */}
              <h2 className={styles.sectionTitle}>Sequência</h2>
              <Card className={styles.card}>
                <MenuLine
                  name={`${streak?.streakAtual ?? 0} ${streak?.streakAtual === 1 ? 'dia seguido' : 'dias seguidos'}`}
                  note={streak?.descontoAtual > 0 ? `${streak.descontoAtual}% de desconto atual` : 'Pede num dia útil para começar'}
                  action={<button className={styles.link} onClick={() => navigate('/streak')}>Ver cartão →</button>}
                />
              </Card>

              {/* ── Sessão ── */}
              <div className={styles.logoutWrap}>
                <Button variant="outline" onClick={handleLogout}>Terminar sessão</Button>
              </div>
            </>
          )}
        </div>
      )}

      <Footer />
    </div>
  )
}
