import { useState, useEffect, useCallback } from 'react'
import { Header, Card, Button, Badge } from '../../components'
import { streakApi, type ApiStreakTier, type ApiClienteStreak } from '../../lib/api'
import styles from './Streak.module.css'

type Draft = ApiStreakTier & { key: string }

let keyCounter = 0
const withKey = (t: ApiStreakTier): Draft => ({ ...t, key: `t${keyCounter++}` })

export function Streak() {
  const [tiers, setTiers] = useState<Draft[]>([])
  const [clientes, setClientes] = useState<ApiClienteStreak[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [config, lista] = await Promise.all([streakApi.getConfig(), streakApi.clientes()])
      setTiers(config.tiers.map(withKey))
      setClientes(lista)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const updateTier = (key: string, patch: Partial<ApiStreakTier>) => {
    setOk(null)
    setTiers((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)))
  }

  const removeTier = (key: string) => {
    setOk(null)
    setTiers((prev) => prev.filter((t) => t.key !== key))
  }

  const addTier = () => {
    setOk(null)
    setTiers((prev) => [...prev, withKey({ dias: 1, tipo: 'desconto', valor: 0, descricao: '' })])
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const payload: ApiStreakTier[] = tiers.map(({ dias, tipo, valor, descricao }) => ({ dias, tipo, valor, descricao }))
      const res = await streakApi.saveConfig(payload)
      setTiers(res.tiers.map(withKey))
      setOk('Escada de recompensas guardada')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Repor a escada de recompensas para os valores por omissão?')) return
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const res = await streakApi.resetConfig()
      setTiers(res.tiers.map(withKey))
      setOk('Escada reposta para os valores por omissão')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 32 }}>A carregar...</div>

  return (
    <div className={styles.page}>
      <Header
        title="Sequência (Streak)"
        subtitle="Configure a escada de recompensas e acompanhe as sequências dos clientes"
      />

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Fechar erro">×</button>
        </div>
      )}
      {ok && <div className={styles.okBanner}>{ok}</div>}

      {/* ── Editor da escada ── */}
      <Card className={styles.section}>
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>Escada de recompensas</h3>
          <div className={styles.sectionActions}>
            <Button variant="secondary" size="small" onClick={handleReset} disabled={saving}>Repor defaults</Button>
            <Button size="small" onClick={handleSave} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
          </div>
        </div>

        <div className={styles.tableHead}>
          <span>Dias</span>
          <span>Tipo</span>
          <span>Valor (%)</span>
          <span>Descrição</span>
          <span />
        </div>

        {tiers
          .slice()
          .sort((a, b) => a.dias - b.dias)
          .map((t) => (
            <div key={t.key} className={styles.tierRow}>
              <input
                type="number"
                min={1}
                className={styles.numInput}
                value={t.dias}
                onChange={(e) => updateTier(t.key, { dias: Number(e.target.value) })}
              />
              <select
                className={styles.select}
                value={t.tipo}
                onChange={(e) => updateTier(t.key, { tipo: e.target.value as ApiStreakTier['tipo'] })}
              >
                <option value="desconto">Desconto</option>
                <option value="item_gratis">Item grátis</option>
              </select>
              <input
                type="number"
                min={0}
                className={styles.numInput}
                value={t.valor}
                disabled={t.tipo !== 'desconto'}
                onChange={(e) => updateTier(t.key, { valor: Number(e.target.value) })}
              />
              <input
                type="text"
                className={styles.textInput}
                placeholder="Ex.: 8% de desconto"
                value={t.descricao}
                onChange={(e) => updateTier(t.key, { descricao: e.target.value })}
              />
              <button className={styles.rowRemove} onClick={() => removeTier(t.key)} aria-label="Remover escalão">×</button>
            </div>
          ))}

        <Button variant="secondary" size="small" onClick={addTier}>+ Adicionar escalão</Button>
      </Card>

      {/* ── Clientes ── */}
      <Card className={styles.section}>
        <h3 className={styles.sectionTitle}>Clientes por sequência</h3>
        {clientes.length === 0 ? (
          <p className={styles.empty}>Ainda não há clientes com sequência.</p>
        ) : (
          <div className={styles.clientList}>
            <div className={styles.clientHead}>
              <span>Cliente</span>
              <span>Atual</span>
              <span>Melhor</span>
              <span>Prémios por resgatar</span>
            </div>
            {clientes.map((c) => {
              const porResgatar = (c.recompensasGanhas ?? []).filter((r) => !r.cumprida).length
              return (
                <div key={c._id} className={styles.clientRow}>
                  <div className={styles.clientName}>
                    <span>{c.nome || 'Sem nome'}</span>
                    <span className={styles.clientPhone}>{c.telefone}</span>
                  </div>
                  <span className={styles.streakNum}>🔥 {c.streakAtual}</span>
                  <span className={styles.streakBest}>{c.maiorStreak}</span>
                  <span>
                    {porResgatar > 0
                      ? <Badge variant="warning">{porResgatar} por resgatar</Badge>
                      : <Badge variant="default">—</Badge>}
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
