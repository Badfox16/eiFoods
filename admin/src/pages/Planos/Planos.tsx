import { useState, useEffect, useCallback } from 'react'
import { Header, Card, Button, Badge } from '../../components'
import {
  planosApi,
  subscricoesApi,
  type ApiPlano,
  type ApiPlanoTipo,
  type ApiSubscricao,
  type ApiSubscricaoEstado,
  type PlanoInput,
} from '../../lib/api'
import styles from './Planos.module.css'

const TIPOS: ApiPlanoTipo[] = ['semanal', 'bissemanal', 'mensal']

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

const emptyForm: PlanoInput = {
  nome: '',
  tipo: 'semanal',
  numRefeicoes: 5,
  preco: 0,
  validadeDias: 7,
  descricao: '',
  ativo: true,
}

function fmtMzn(v: number) {
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

export function Planos() {
  const [planos, setPlanos] = useState<ApiPlano[]>([])
  const [subs, setSubs] = useState<ApiSubscricao[]>([])
  const [filtro, setFiltro] = useState<ApiSubscricaoEstado | 'all'>('pendente_pagamento')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Editor de plano (criar/editar)
  const [form, setForm] = useState<PlanoInput>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadPlanos = useCallback(async () => {
    setPlanos(await planosApi.list())
  }, [])

  const loadSubs = useCallback(async () => {
    setSubs(await subscricoesApi.list(filtro === 'all' ? undefined : filtro))
  }, [filtro])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadPlanos(), loadSubs()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [loadPlanos, loadSubs])

  useEffect(() => { void load() }, [load])
  // Recarrega subscrições ao mudar o filtro
  useEffect(() => { void loadSubs().catch((e) => setError((e as Error).message)) }, [loadSubs])

  const startEdit = (p: ApiPlano) => {
    setEditId(p._id)
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      numRefeicoes: p.numRefeicoes,
      preco: p.preco,
      validadeDias: p.validadeDias,
      descricao: p.descricao,
      ativo: p.ativo,
    })
    setOk(null)
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm(emptyForm)
  }

  const handleSavePlano = async () => {
    if (!form.nome.trim()) { setError('Nome do plano é obrigatório'); return }
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      if (editId) {
        await planosApi.update(editId, form)
        setOk('Plano atualizado')
      } else {
        await planosApi.create(form)
        setOk('Plano criado')
      }
      cancelEdit()
      await loadPlanos()
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
      await loadPlanos()
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
      await loadSubs()
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
      await loadSubs()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <div style={{ padding: 32 }}>A carregar...</div>

  return (
    <div className={styles.page}>
      <Header
        title="Planos pré-pagos"
        subtitle="Configure pacotes de refeições e confirme pagamentos de subscrições"
      />

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Fechar erro">×</button>
        </div>
      )}
      {ok && <div className={styles.okBanner}>{ok}</div>}

      {/* ── Editor de plano ── */}
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
              placeholder="Ex.: Plano Semanal"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>Tipo</span>
            <select
              className={styles.select}
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as ApiPlanoTipo })}
            >
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
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
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })}
            />
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

      {/* ── Lista de planos ── */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Planos</h3>
        {planos.length === 0 ? (
          <p className={styles.empty}>Ainda não há planos. Crie o primeiro acima.</p>
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
            {planos.map((p) => (
              <div key={p._id} className={styles.planoRow}>
                <div className={styles.planoName}>
                  <span>{p.nome}</span>
                  <span className={styles.planoSub}>{p.tipo}{p.descricao ? ` · ${p.descricao}` : ''}</span>
                </div>
                <span>{p.numRefeicoes}</span>
                <span>{fmtMzn(p.preco)}</span>
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

      {/* ── Subscrições ── */}
      <Card className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Subscrições</h3>
          <div className={styles.filters}>
            {(['pendente_pagamento', 'ativa', 'expirada', 'rejeitada', 'all'] as const).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filtro === f ? styles.filterActive : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f === 'all' ? 'Todas' : ESTADO_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {subs.length === 0 ? (
          <p className={styles.empty}>Nenhuma subscrição {filtro !== 'all' ? 'neste estado' : ''}.</p>
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
            {subs.map((s) => {
              const c = clienteInfo(s)
              return (
                <div key={s._id} className={styles.subRow}>
                  <div className={styles.clientName}>
                    <span>{c.nome}</span>
                    <span className={styles.clientPhone}>{c.telefone}</span>
                  </div>
                  <div className={styles.planoName}>
                    <span>{s.planoNome}</span>
                    <span className={styles.planoSub}>{fmtMzn(s.preco)}</span>
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
    </div>
  )
}
