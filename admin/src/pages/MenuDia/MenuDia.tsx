import { useState, useEffect, useCallback } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card, Button, Badge } from '../../components'
import { menuApi, type ApiMenu, type ApiMenuItem, type ApiPrato } from '../../lib/api'
import { formatPrice } from '../../../../shared/utils'
import styles from './MenuDia.module.css'

/** Chave AAAA-MM-DD para o input date (data local do browser) */
function todayKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface DraftItem {
  pratoId: string
  destaque: boolean
  exclusivo: boolean
}

function itemPratoId(item: ApiMenuItem): string {
  return typeof item.pratoId === 'string' ? item.pratoId : item.pratoId._id
}

export function MenuDia() {
  const { state } = useAdmin()
  const [data, setData] = useState<string>(todayKey())
  const [itens, setItens] = useState<DraftItem[]>([])
  const [ativo, setAtivo] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  // Carrega o menu da data selecionada
  const loadMenu = useCallback(async (dateKey: string) => {
    setLoading(true)
    setError(null)
    setOk(null)
    try {
      const menu: ApiMenu | null = await menuApi.getByData(dateKey)
      if (menu && Array.isArray(menu.itens)) {
        setItens(menu.itens.map((i) => ({
          pratoId: itemPratoId(i),
          destaque: Boolean(i.destaque),
          exclusivo: Boolean(i.exclusivo),
        })))
        setAtivo(menu.ativo ?? true)
      } else {
        setItens([])
        setAtivo(true)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMenu(data)
  }, [data, loadMenu])

  const selecionados = new Set(itens.map((i) => i.pratoId))

  const togglePrato = (pratoId: string) => {
    setOk(null)
    setItens((prev) =>
      prev.some((i) => i.pratoId === pratoId)
        ? prev.filter((i) => i.pratoId !== pratoId)
        : [...prev, { pratoId, destaque: false, exclusivo: false }]
    )
  }

  const setDestaque = (pratoId: string) => {
    setOk(null)
    // Apenas um prato em destaque por dia
    setItens((prev) => prev.map((i) => ({ ...i, destaque: i.pratoId === pratoId ? !i.destaque : false })))
  }

  const toggleExclusivo = (pratoId: string) => {
    setOk(null)
    setItens((prev) => prev.map((i) => (i.pratoId === pratoId ? { ...i, exclusivo: !i.exclusivo } : i)))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      await menuApi.save(data, {
        itens: itens.map((i) => ({ pratoId: i.pratoId, destaque: i.destaque, exclusivo: i.exclusivo })),
        ativo,
      })
      setOk('Menu guardado com sucesso')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const draftOf = (pratoId: string): DraftItem | undefined => itens.find((i) => i.pratoId === pratoId)

  if (state.loading) return <div style={{ padding: 32 }}>A carregar...</div>

  return (
    <div className={styles.page}>
      <Header
        title="Menu do Dia"
        subtitle="Escolha a data e monte o menu — marque destaque e pratos exclusivos"
      />

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Fechar erro">×</button>
        </div>
      )}
      {ok && <div className={styles.okBanner}>{ok}</div>}

      <Card className={styles.toolbar}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="menu-data">Data do menu</label>
          <input
            id="menu-data"
            type="date"
            className={styles.dateInput}
            value={data}
            onChange={(e) => setData(e.target.value || todayKey())}
          />
        </div>
        <label className={styles.ativoWrap}>
          <input type="checkbox" checked={ativo} onChange={(e) => { setAtivo(e.target.checked); setOk(null) }} />
          <span>Menu ativo</span>
        </label>
        <div className={styles.toolbarRight}>
          <Badge variant="info">{itens.length} prato{itens.length === 1 ? '' : 's'}</Badge>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'A guardar...' : 'Guardar menu'}
          </Button>
        </div>
      </Card>

      {loading ? (
        <div style={{ padding: 24, color: 'var(--ui-text-3)' }}>A carregar menu...</div>
      ) : state.pratos.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: 'var(--ui-text-2)' }}>Nenhum prato cadastrado. Crie pratos primeiro.</p>
        </Card>
      ) : (
        <div className={styles.grid}>
          {state.pratos.map((prato: ApiPrato) => {
            const selecionado = selecionados.has(prato._id)
            const draft = draftOf(prato._id)
            return (
              <Card
                key={prato._id}
                className={`${styles.pratoCard}${selecionado ? ' ' + styles.pratoCardSel : ''}`}
              >
                <div className={styles.pratoHeader}>
                  {prato.imagem?.url && (
                    <img src={prato.imagem.url} alt={prato.nome} className={styles.pratoImagem} />
                  )}
                  <div className={styles.pratoInfo}>
                    <p className={styles.pratoNome}>{prato.nome}</p>
                    <p className={styles.pratoPreco}>{formatPrice(prato.preco)}</p>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Button
                    variant={selecionado ? 'danger' : 'primary'}
                    size="small"
                    onClick={() => togglePrato(prato._id)}
                  >
                    {selecionado ? 'Remover' : 'Adicionar'}
                  </Button>

                  {selecionado && draft && (
                    <div className={styles.flags}>
                      <label className={styles.flag}>
                        <input
                          type="checkbox"
                          checked={draft.destaque}
                          onChange={() => setDestaque(prato._id)}
                        />
                        <span>Destaque</span>
                      </label>
                      <label className={styles.flag}>
                        <input
                          type="checkbox"
                          checked={draft.exclusivo}
                          onChange={() => toggleExclusivo(prato._id)}
                        />
                        <span>Exclusivo (premium)</span>
                      </label>
                    </div>
                  )}
                </div>

                {selecionado && draft?.destaque && <Badge variant="success">Destaque</Badge>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
