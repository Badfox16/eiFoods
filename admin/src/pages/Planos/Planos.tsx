import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card, Button, Badge, StatCard } from '../../components'
import {
  planosApi,
  subscricoesApi,
  menuApi,
  planoMenuApi,
  type ApiPlano,
  type ApiDuracaoPlano,
  type ApiTipoPlano,
  type ApiPrecoUnidade,
  type ApiSubscricao,
  type ApiSubscricaoEstado,
  type PlanoInput,
  type ApiMenuItem,
  type ApiCategoriaComMenuProprio,
  type ApiPrato,
} from '../../lib/api'
import { CATEGORIA_LABEL, DURACAO_CONFIG, DURACAO_ORDEM } from '../../../../shared/constants'
import styles from './Planos.module.css'

const CATEGORIAS: ApiTipoPlano[] = ['classico', 'premium_fit_starter', 'premium_muscle', 'premium_equilibrio']
const DURACOES: ApiDuracaoPlano[] = [...DURACAO_ORDEM] as ApiDuracaoPlano[]
const PRECO_UNIDADES: ApiPrecoUnidade[] = ['total', 'por_refeicao']
const PRECO_UNIDADE_LABEL: Record<ApiPrecoUnidade, string> = {
  total: 'Total do pacote',
  por_refeicao: 'Por refeição',
}

const ESTADO_LABEL: Record<ApiSubscricaoEstado, string> = {
  pendente_pagamento: 'Pendente',
  ativa: 'Ativa',
  expirada: 'Expirada',
  rejeitada: 'Rejeitada',
}
const ESTADO_VARIANT: Record<ApiSubscricaoEstado, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pendente_pagamento: 'warning',
  ativa: 'success',
  expirada: 'default',
  rejeitada: 'danger',
}

const ABAS = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'planos', label: 'Planos' },
  { id: 'subscricoes', label: 'Subscrições' },
  { id: 'menus', label: 'Menus' },
] as const
type Aba = (typeof ABAS)[number]['id']

const emptyForm: PlanoInput = {
  nome: '',
  categoria: 'classico',
  duracao: 'starter',
  numRefeicoes: DURACAO_CONFIG.starter.numRefeicoes,
  preco: 0,
  precoUnidade: 'total',
  validadeDias: DURACAO_CONFIG.starter.dias,
  descricao: '',
  ativo: true,
}

function fmtMzn(v: number | null) {
  if (v === null) return 'Preço a confirmar'
  return `${v.toLocaleString('pt-PT')} MT`
}
function fmtData(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT')
}
function clienteInfo(s: ApiSubscricao) {
  if (typeof s.clienteId === 'object' && s.clienteId) {
    return { nome: s.clienteId.nome || 'Sem nome', telefone: s.clienteId.telefone }
  }
  return { nome: 'Cliente', telefone: String(s.clienteId) }
}
/** Chave AAAA-MM-DD do dia local do browser (menu do dia usado pelo Clássico). */
function todayKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function itemPratoId(item: { pratoId: ApiPrato | string }): string {
  return typeof item.pratoId === 'string' ? item.pratoId : item.pratoId._id
}

interface DraftItemClassico {
  pratoId: string
  destaque: boolean
  exclusivo: boolean
}

// Ícones de aba
function IcoGeral() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
}
function IcoPlanos() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
}
function IcoSubs() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}
function IcoMenus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" /></svg>
}
const ABA_ICON: Record<Aba, React.ReactNode> = { geral: <IcoGeral />, planos: <IcoPlanos />, subscricoes: <IcoSubs />, menus: <IcoMenus /> }

export function Planos() {
  const { state: adminState } = useAdmin() // state.pratos já carregado globalmente

  const [aba, setAba] = useState<Aba>('geral')

  const [planos, setPlanos] = useState<ApiPlano[]>([])
  const [subs, setSubs] = useState<ApiSubscricao[]>([]) // todas — filtramos localmente
  const [filtroSubs, setFiltroSubs] = useState<ApiSubscricaoEstado | 'all'>('pendente_pagamento')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Editor de plano (criar/editar)
  const [form, setForm] = useState<PlanoInput>(emptyForm)
  const [precoIndefinido, setPrecoIndefinido] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Aba Menus
  const [menuCategoria, setMenuCategoria] = useState<ApiTipoPlano>('classico')
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuSaving, setMenuSaving] = useState(false)
  const [menuAtivo, setMenuAtivo] = useState(true)
  const [menuItensClassico, setMenuItensClassico] = useState<DraftItemClassico[]>([])
  const [menuPratoIdsPremium, setMenuPratoIdsPremium] = useState<string[]>([])
  const [menuError, setMenuError] = useState<string | null>(null)
  const [menuOk, setMenuOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listaPlanos, todasSubs] = await Promise.all([planosApi.list(), subscricoesApi.list()])
      setPlanos(listaPlanos)
      setSubs(todasSubs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const loadMenuTab = useCallback(async (categoria: ApiTipoPlano) => {
    setMenuLoading(true)
    setMenuError(null)
    setMenuOk(null)
    try {
      if (categoria === 'classico') {
        const menu = await menuApi.getByData(todayKey())
        const itens = (menu?.itens ?? []) as ApiMenuItem[]
        setMenuItensClassico(itens.map((i) => ({ pratoId: itemPratoId(i), destaque: Boolean(i.destaque), exclusivo: Boolean(i.exclusivo) })))
        setMenuAtivo(menu?.ativo ?? true)
      } else {
        const menu = await planoMenuApi.get(categoria as ApiCategoriaComMenuProprio)
        setMenuPratoIdsPremium((menu.itens ?? []).map(itemPratoId))
        setMenuAtivo(menu.ativo ?? true)
      }
    } catch (e) {
      setMenuError((e as Error).message)
    } finally {
      setMenuLoading(false)
    }
  }, [])

  useEffect(() => { if (aba === 'menus') void loadMenuTab(menuCategoria) }, [aba, menuCategoria, loadMenuTab])

  // ── Estatísticas (aba Visão geral) ──
  const stats = useMemo(() => {
    const planosAtivos = planos.filter((p) => p.ativo).length
    const pendentes = subs.filter((s) => s.estado === 'pendente_pagamento').length
    const ativas = subs.filter((s) => s.estado === 'ativa').length
    const receita = subs
      .filter((s) => s.estado === 'ativa' || s.estado === 'expirada')
      .reduce((sum, s) => sum + s.preco, 0)
    return { planosAtivos, pendentes, ativas, receita }
  }, [planos, subs])

  const planosPorCategoria = useMemo(() => {
    const grupos = new Map<ApiTipoPlano, ApiPlano[]>()
    for (const c of CATEGORIAS) grupos.set(c, [])
    for (const p of planos) grupos.get(p.categoria)?.push(p)
    return grupos
  }, [planos])

  const subsFiltradas = useMemo(
    () => (filtroSubs === 'all' ? subs : subs.filter((s) => s.estado === filtroSubs)),
    [subs, filtroSubs]
  )

  // ── Editor de plano ──
  const setDuracao = (duracao: ApiDuracaoPlano) => {
    const cfg = DURACAO_CONFIG[duracao]
    setForm((f) => ({ ...f, duracao, numRefeicoes: cfg.numRefeicoes, validadeDias: cfg.dias }))
  }

  const startEdit = (p: ApiPlano) => {
    setAba('planos')
    setEditId(p._id)
    setForm({
      nome: p.nome,
      categoria: p.categoria,
      duracao: p.duracao,
      numRefeicoes: p.numRefeicoes,
      preco: p.preco,
      precoUnidade: p.precoUnidade,
      validadeDias: p.validadeDias,
      descricao: p.descricao,
      ativo: p.ativo,
    })
    setPrecoIndefinido(p.preco === null)
    setOk(null)
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(emptyForm)
    setPrecoIndefinido(false)
  }

  const handleSavePlano = async () => {
    if (!form.nome.trim()) { setError('Nome do plano é obrigatório'); return }
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const payload: PlanoInput = { ...form, preco: precoIndefinido ? null : form.preco }
      if (editId) {
        await planosApi.update(editId, payload)
        setOk('Plano atualizado')
      } else {
        await planosApi.create(payload)
        setOk('Plano criado')
      }
      cancelEdit()
      setPlanos(await planosApi.list())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlano = async (p: ApiPlano) => {
    if (!confirm(`Desativar o plano "${p.nome}"? As subscrições existentes não são afetadas.`)) return
    setError(null)
    try {
      await planosApi.delete(p._id)
      setOk('Plano desativado')
      setPlanos(await planosApi.list())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleConfirmar = async (s: ApiSubscricao) => {
    if (!confirm(`Confirmar pagamento e ativar ${s.numRefeicoes} refeições para ${clienteInfo(s).nome}?`)) return
    setError(null)
    try {
      await subscricoesApi.confirmar(s._id)
      setOk('Subscrição ativada')
      setSubs(await subscricoesApi.list())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRejeitar = async (s: ApiSubscricao) => {
    const nota = prompt('Motivo da rejeição (opcional):') ?? undefined
    setError(null)
    try {
      await subscricoesApi.rejeitar(s._id, nota)
      setOk('Subscrição rejeitada')
      setSubs(await subscricoesApi.list())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // ── Aba Menus ──
  const selecionadosMenu = new Set(
    menuCategoria === 'classico' ? menuItensClassico.map((i) => i.pratoId) : menuPratoIdsPremium
  )

  const toggleMenuPrato = (pratoId: string) => {
    setMenuOk(null)
    if (menuCategoria === 'classico') {
      setMenuItensClassico((prev) =>
        prev.some((i) => i.pratoId === pratoId) ? prev.filter((i) => i.pratoId !== pratoId) : [...prev, { pratoId, destaque: false, exclusivo: false }]
      )
    } else {
      setMenuPratoIdsPremium((prev) => (prev.includes(pratoId) ? prev.filter((id) => id !== pratoId) : [...prev, pratoId]))
    }
  }

  const setDestaqueClassico = (pratoId: string) => {
    setMenuOk(null)
    setMenuItensClassico((prev) => prev.map((i) => ({ ...i, destaque: i.pratoId === pratoId ? !i.destaque : false })))
  }
  const toggleExclusivoClassico = (pratoId: string) => {
    setMenuOk(null)
    setMenuItensClassico((prev) => prev.map((i) => (i.pratoId === pratoId ? { ...i, exclusivo: !i.exclusivo } : i)))
  }

  const handleSaveMenu = async () => {
    setMenuSaving(true)
    setMenuError(null)
    setMenuOk(null)
    try {
      if (menuCategoria === 'classico') {
        await menuApi.save(todayKey(), {
          itens: menuItensClassico.map((i) => ({ pratoId: i.pratoId, destaque: i.destaque, exclusivo: i.exclusivo })),
          ativo: menuAtivo,
        })
      } else {
        await planoMenuApi.save(menuCategoria as ApiCategoriaComMenuProprio, {
          itens: menuPratoIdsPremium.map((pratoId) => ({ pratoId })),
          ativo: menuAtivo,
        })
      }
      setMenuOk('Cardápio guardado com sucesso')
    } catch (e) {
      setMenuError((e as Error).message)
    } finally {
      setMenuSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 32 }}>A carregar...</div>

  return (
    <div className={styles.page}>
      <Header
        title="Planos"
        subtitle="Categorias, durações, subscrições e cardápios dos planos pré-pagos"
      />

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Fechar erro">×</button>
        </div>
      )}
      {ok && <div className={styles.okBanner}>{ok}</div>}

      {/* ── Abas ── */}
      <div className={styles.tabBar}>
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={`${styles.tabBtn} ${aba === a.id ? styles.tabActive : ''}`}
            onClick={() => setAba(a.id)}
          >
            <span className={styles.tabIcon}>{ABA_ICON[a.id]}</span>
            {a.label}
            {a.id === 'subscricoes' && stats.pendentes > 0 && (
              <span className={styles.tabBadge}>{stats.pendentes}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Visão geral ── */}
      {aba === 'geral' && (
        <>
          <div className={styles.statsGrid}>
            <StatCard title="Planos ativos" value={stats.planosAtivos} icon={<IcoPlanos />} color="#2C5A6B" />
            <StatCard title="Subscrições pendentes" value={stats.pendentes} icon={<IcoSubs />} color="#B5790C" />
            <StatCard title="Subscrições ativas" value={stats.ativas} icon={<IcoSubs />} color="#359420" />
            <StatCard title="Receita confirmada" value={fmtMzn(stats.receita)} icon={<IcoGeral />} color="#E2570F" />
          </div>

          <Card className={styles.section}>
            <h3 className={styles.sectionTitle}>Planos por categoria</h3>
            <div className={styles.categoriaOverview}>
              {CATEGORIAS.map((c) => {
                const lista = planosPorCategoria.get(c) ?? []
                return (
                  <div key={c} className={styles.categoriaOverviewCard}>
                    <span className={styles.categoriaOverviewNome}>{CATEGORIA_LABEL[c]}</span>
                    <span className={styles.categoriaOverviewCount}>{lista.filter((p) => p.ativo).length} de {lista.length} ativos</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {/* ── Planos ── */}
      {aba === 'planos' && (
        <>
          <Card className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>{editId ? 'Editar plano' : 'Novo plano'}</h3>
              {editId && <Button variant="secondary" size="small" onClick={cancelEdit}>Cancelar edição</Button>}
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Nome</span>
                <input
                  className={styles.textInput}
                  placeholder="Ex.: Clássico — Starter"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>Categoria</span>
                <select
                  className={styles.select}
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as ApiTipoPlano })}
                >
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Duração</span>
                <select
                  className={styles.select}
                  value={form.duracao}
                  onChange={(e) => setDuracao(e.target.value as ApiDuracaoPlano)}
                  disabled={form.categoria !== 'classico'}
                >
                  {DURACOES.map((d) => <option key={d} value={d}>{DURACAO_CONFIG[d].label}</option>)}
                </select>
                {form.categoria !== 'classico' && (
                  <span className={styles.fieldHint}>Planos premium não têm variante de duração — um único plano por categoria.</span>
                )}
              </label>
              <label className={styles.field}>
                <span>Nº refeições</span>
                <input
                  type="number" min={1} className={styles.numInput}
                  value={form.numRefeicoes}
                  onChange={(e) => setForm({ ...form, numRefeicoes: Number(e.target.value) })}
                />
              </label>
              <label className={styles.field}>
                <span>Preço (MT)</span>
                <input
                  type="number" min={0} className={styles.numInput}
                  value={form.preco ?? ''}
                  disabled={precoIndefinido}
                  placeholder={precoIndefinido ? 'A confirmar' : undefined}
                  onChange={(e) => setForm({ ...form, preco: e.target.value === '' ? 0 : Number(e.target.value) })}
                />
              </label>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={precoIndefinido}
                  onChange={(e) => setPrecoIndefinido(e.target.checked)}
                />
                <span>Preço ainda por definir (mostra "Preço a confirmar")</span>
              </label>
              <label className={styles.field}>
                <span>Preço é…</span>
                <select
                  className={styles.select}
                  value={form.precoUnidade}
                  onChange={(e) => setForm({ ...form, precoUnidade: e.target.value as ApiPrecoUnidade })}
                >
                  {PRECO_UNIDADES.map((u) => <option key={u} value={u}>{PRECO_UNIDADE_LABEL[u]}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Validade (dias)</span>
                <input
                  type="number" min={1} className={styles.numInput}
                  value={form.validadeDias}
                  onChange={(e) => setForm({ ...form, validadeDias: Number(e.target.value) })}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Descrição</span>
                <input
                  className={styles.textInput}
                  placeholder="Ex.: 5 almoços para a semana de trabalho"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </label>
              <label className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={form.ativo ?? true}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
                <span>Ativo (visível para clientes)</span>
              </label>
            </div>

            <div className={styles.formActions}>
              <Button size="small" onClick={handleSavePlano} disabled={saving}>
                {saving ? 'A guardar...' : editId ? 'Guardar alterações' : 'Criar plano'}
              </Button>
            </div>
          </Card>

          {CATEGORIAS.map((categoria) => {
            const lista = planosPorCategoria.get(categoria) ?? []
            return (
              <Card key={categoria} className={styles.section}>
                <h3 className={styles.sectionTitle}>{CATEGORIA_LABEL[categoria]}</h3>
                {lista.length === 0 ? (
                  <p className={styles.empty}>Nenhum plano nesta categoria ainda.</p>
                ) : (
                  <div className={styles.planoList}>
                    <div className={styles.planoHead}>
                      <span>Plano</span>
                      <span>Refeições</span>
                      <span>Preço</span>
                      <span>Validade</span>
                      <span>Estado</span>
                      <span />
                    </div>
                    {lista.map((p) => (
                      <div key={p._id} className={styles.planoRow}>
                        <div className={styles.planoName}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {p.nome}
                            {p.premium && <Badge variant="warning">👑 Premium</Badge>}
                          </span>
                          <span className={styles.planoSub}>
                            {categoria === 'classico' ? DURACAO_CONFIG[p.duracao].label : 'Plano único'}
                            {p.descricao ? ` · ${p.descricao}` : ''}
                          </span>
                        </div>
                        <span>{p.numRefeicoes}</span>
                        <span>{fmtMzn(p.preco)}{p.preco !== null && p.precoUnidade === 'por_refeicao' ? ' /refeição' : ''}</span>
                        <span>{p.validadeDias} dias</span>
                        <span>{p.ativo ? <Badge variant="success">Ativo</Badge> : <Badge variant="default">Inativo</Badge>}</span>
                        <span className={styles.rowActions}>
                          <button className={styles.linkBtn} onClick={() => startEdit(p)}>Editar</button>
                          {p.ativo && <button className={styles.linkBtnDanger} onClick={() => handleDeletePlano(p)}>Desativar</button>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </>
      )}

      {/* ── Subscrições ── */}
      {aba === 'subscricoes' && (
        <Card className={styles.section}>
          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Subscrições</h3>
            <div className={styles.filters}>
              {(['pendente_pagamento', 'ativa', 'expirada', 'rejeitada', 'all'] as const).map((f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${filtroSubs === f ? styles.filterActive : ''}`}
                  onClick={() => setFiltroSubs(f)}
                >
                  {f === 'all' ? 'Todas' : ESTADO_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          {subsFiltradas.length === 0 ? (
            <p className={styles.empty}>Nenhuma subscrição {filtroSubs !== 'all' ? 'neste estado' : ''}.</p>
          ) : (
            <div className={styles.subList}>
              <div className={styles.subHead}>
                <span>Cliente</span>
                <span>Plano</span>
                <span>Saldo</span>
                <span>Validade</span>
                <span>Comprovativo</span>
                <span>Estado</span>
                <span />
              </div>
              {subsFiltradas.map((s) => {
                const c = clienteInfo(s)
                return (
                  <div key={s._id} className={styles.subRow}>
                    <div className={styles.clientName}>
                      <span>{c.nome}</span>
                      <span className={styles.clientPhone}>{c.telefone}</span>
                    </div>
                    <div className={styles.planoName}>
                      <span>{s.planoNome}</span>
                      <span className={styles.planoSub}>
                        {CATEGORIA_LABEL[s.categoria]} · {DURACAO_CONFIG[s.duracao].label} · {fmtMzn(s.preco)}
                      </span>
                    </div>
                    <span>{s.refeicoesRestantes}/{s.numRefeicoes}</span>
                    <span>{fmtData(s.dataExpiracao)}</span>
                    <span>
                      {s.comprovativo?.url
                        ? <a className={styles.linkBtn} href={s.comprovativo.url} target="_blank" rel="noreferrer">Ver</a>
                        : <span className={styles.muted}>—</span>}
                    </span>
                    <span><Badge variant={ESTADO_VARIANT[s.estado]}>{ESTADO_LABEL[s.estado]}</Badge></span>
                    <span className={styles.rowActions}>
                      {s.estado === 'pendente_pagamento' && (
                        <>
                          <button className={styles.linkBtn} onClick={() => handleConfirmar(s)}>Confirmar</button>
                          <button className={styles.linkBtnDanger} onClick={() => handleRejeitar(s)}>Rejeitar</button>
                        </>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Menus ── */}
      {aba === 'menus' && (
        <>
          <Card className={styles.toolbar}>
            <div className={styles.field}>
              <span className={styles.label}>Categoria</span>
              <div className={styles.filters}>
                {CATEGORIAS.map((c) => (
                  <button
                    key={c}
                    className={`${styles.filterBtn} ${menuCategoria === c ? styles.filterActive : ''}`}
                    onClick={() => setMenuCategoria(c)}
                  >
                    {CATEGORIA_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <label className={styles.ativoWrap}>
              <input type="checkbox" checked={menuAtivo} onChange={(e) => { setMenuAtivo(e.target.checked); setMenuOk(null) }} />
              <span>Cardápio ativo</span>
            </label>
            <div className={styles.toolbarRight}>
              <Badge variant="info">{selecionadosMenu.size} prato{selecionadosMenu.size === 1 ? '' : 's'}</Badge>
              <Button onClick={handleSaveMenu} disabled={menuSaving || menuLoading}>
                {menuSaving ? 'A guardar...' : 'Guardar cardápio'}
              </Button>
            </div>
          </Card>

          {menuError && (
            <div className={styles.errorBanner}>
              {menuError}
              <button className={styles.errorClose} onClick={() => setMenuError(null)} aria-label="Fechar erro">×</button>
            </div>
          )}
          {menuOk && <div className={styles.okBanner}>{menuOk}</div>}

          {menuCategoria === 'classico' && (
            <p className={styles.fieldHint}>
              A editar o menu de hoje ({todayKey()}). Para agendar outras datas ou usar destaque/exclusivo com
              mais detalhe, usa a página <strong>Menu do Dia</strong>.
            </p>
          )}

          {menuLoading ? (
            <div style={{ padding: 24, color: 'var(--ui-text-3)' }}>A carregar cardápio...</div>
          ) : adminState.pratos.length === 0 ? (
            <Card>
              <p style={{ margin: 0, color: 'var(--ui-text-2)' }}>Nenhum prato cadastrado. Crie pratos primeiro.</p>
            </Card>
          ) : (
            <div className={styles.grid}>
              {adminState.pratos.map((prato) => {
                const selecionado = selecionadosMenu.has(prato._id)
                const draftClassico = menuCategoria === 'classico' ? menuItensClassico.find((i) => i.pratoId === prato._id) : undefined
                return (
                  <Card key={prato._id} className={`${styles.pratoCard}${selecionado ? ' ' + styles.pratoCardSel : ''}`}>
                    <div className={styles.pratoHeader}>
                      {prato.imagem?.url && <img src={prato.imagem.url} alt={prato.nome} className={styles.pratoImagem} />}
                      <div className={styles.pratoInfo}>
                        <p className={styles.pratoNome}>{prato.nome}</p>
                        <p className={styles.pratoPreco}>{fmtMzn(prato.preco)}</p>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <Button
                        variant={selecionado ? 'danger' : 'primary'}
                        size="small"
                        onClick={() => toggleMenuPrato(prato._id)}
                      >
                        {selecionado ? 'Remover' : 'Adicionar'}
                      </Button>

                      {menuCategoria === 'classico' && selecionado && draftClassico && (
                        <div className={styles.flags}>
                          <label className={styles.flag}>
                            <input type="checkbox" checked={draftClassico.destaque} onChange={() => setDestaqueClassico(prato._id)} />
                            <span>Destaque</span>
                          </label>
                          <label className={styles.flag}>
                            <input type="checkbox" checked={draftClassico.exclusivo} onChange={() => toggleExclusivoClassico(prato._id)} />
                            <span>Exclusivo</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
