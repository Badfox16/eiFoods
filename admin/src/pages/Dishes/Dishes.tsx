import { useEffect, useMemo, useState } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card, Button } from '../../components'
import { formatPrice } from '../../../../shared/utils'
import type { ApiExtra, ApiPrato } from '../../lib/api'
import type { DishFormData } from '../../types/admin.types'
import styles from './Dishes.module.css'

function IcoPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function IcoEditar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function IcoLixo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

function IcoPratoVazio() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ui-text-3)' }}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  )
}

function getExclusiveExtrasCount(dish: ApiPrato): number {
  if (!dish.extrasProprios?.length) return 0
  return dish.extrasProprios.length
}

export function Dishes() {
  const { state, createPrato, updatePrato, deletePrato, toggleDisponivel } = useAdmin()
  const [showModal, setShowModal] = useState(false)
  const [editingDish, setEditingDish] = useState<ApiPrato | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const filteredDishes = state.pratos.filter(prato =>
    prato.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddDish = () => {
    setEditingDish(null)
    setShowModal(true)
  }

  const handleEditDish = (dish: ApiPrato) => {
    setEditingDish(dish)
    setShowModal(true)
  }

  const handleDeleteDish = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este prato? A imagem será removida do Cloudinary.')) return
    try {
      await deletePrato(id)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  const handleToggle = async (dish: ApiPrato) => {
    try {
      await toggleDisponivel(dish._id, !dish.disponivel)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  const handleSave = async (data: DishFormData) => {
    try {
      if (editingDish) {
        await updatePrato(editingDish._id, data)
      } else {
        await createPrato(data)
      }
      setShowModal(false)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  if (state.loading) {
    return <div style={{ padding: '2rem' }}>A carregar pratos...</div>
  }

  return (
    <div className={styles.dishes}>
      <Header
        title="Gestão de Pratos"
        subtitle={`${state.pratos.length} pratos no menu`}
        actions={
          <Button onClick={handleAddDish}>
            <IcoPlus /> Adicionar Prato
          </Button>
        }
      />

      {actionError && (
        <Card className={styles.searchCard} style={{ borderColor: 'var(--ui-danger)', color: 'var(--ui-danger)' }}>
          {actionError} <button onClick={() => setActionError(null)} style={{ marginLeft: 8 }}>✕</button>
        </Card>
      )}

      {/* Barra de pesquisa */}
      <Card className={styles.searchCard}>
        <input
          type="text"
          placeholder="Pesquisar pratos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </Card>

      {/* Grid de pratos */}
      <div className={styles.dishesGrid}>
        {filteredDishes.map(dish => (
          <Card key={dish._id} className={styles.dishCard} hover>
            <img src={dish.imagem.url} alt={dish.nome} className={styles.dishImagem} />
            {getExclusiveExtrasCount(dish) > 0 && (
              <div className={styles.exclusiveBadge}>
                {getExclusiveExtrasCount(dish)} extra{getExclusiveExtrasCount(dish) > 1 ? 's' : ''} exclusivo{getExclusiveExtrasCount(dish) > 1 ? 's' : ''}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h3 className={styles.dishName} style={{ flex: 1 }}>{dish.nome}</h3>
              <button
                title={dish.disponivel ? 'Disponível hoje — clique para desativar' : 'Indisponível — clique para ativar'}
                onClick={() => handleToggle(dish)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  background: dish.disponivel ? 'var(--ui-success, #22c55e)' : 'var(--ui-text-3, #9ca3af)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {dish.disponivel ? 'Disponível' : 'Indisponível'}
              </button>
            </div>
            <p className={styles.dishDescription}>{dish.descricao}</p>
            <div className={styles.dishPrice}>{formatPrice(dish.preco)}</div>
            <div className={styles.dishActions}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleEditDish(dish)}
              >
                <IcoEditar /> Editar
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => handleDeleteDish(dish._id)}
              >
                <IcoLixo /> Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredDishes.length === 0 && (
        <Card className={styles.emptyState}>
          <div className={styles.emptyIcon}><IcoPratoVazio /></div>
          <h3 className={styles.emptyTitle}>Nenhum prato encontrado</h3>
          <p className={styles.emptyText}>
            {searchQuery
              ? 'Tente ajustar sua pesquisa'
              : 'Adicione seu primeiro prato ao menu'}
          </p>
        </Card>
      )}

      {/* Modal de formulário */}
      {showModal && (
        <DishModal
          dish={editingDish}
          extras={state.extras}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// Modal de formulário
interface DishModalProps {
  dish: ApiPrato | null
  extras: ApiExtra[]
  onClose: () => void
  onSave: (data: DishFormData) => Promise<void>
}

function DishModal({ dish, extras, onClose, onSave }: DishModalProps) {
  const initialExtras = useMemo(() => {
    if (!dish?.extrasProprios?.length) return [] as string[]
    return dish.extrasProprios
      .map((extra) => (typeof extra === 'string' ? extra : extra._id))
      .filter(Boolean)
  }, [dish])

  const [formData, setFormData] = useState<Omit<DishFormData, 'imageFile'>>({
    nome: dish?.nome ?? '',
    preco: dish?.preco ?? 0,
    descricao: dish?.descricao ?? '',
    disponivel: dish?.disponivel ?? true,
  })
  const [imageFile, setImageFile] = useState<File | undefined>()
  const [selectedExclusiveExtras, setSelectedExclusiveExtras] = useState<string[]>(initialExtras)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const globalExtras = useMemo(() => extras.filter((extra) => extra.global), [extras])
  const exclusiveExtras = useMemo(() => extras.filter((extra) => !extra.global), [extras])

  // Preview derivado: object URL do ficheiro escolhido, ou a imagem atual do prato.
  const objectUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : undefined),
    [imageFile]
  )
  const previewUrl = objectUrl ?? dish?.imagem.url ?? ''

  // Revoga o object URL ao trocar de ficheiro / desmontar (evita fuga de memória).
  useEffect(() => {
    if (!objectUrl) return
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const handleToggleExclusiveExtra = (extraId: string) => {
    setSelectedExclusiveExtras((prev) => (
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome || !formData.preco) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    if (!dish && !imageFile) {
      setError('Imagem obrigatória para novo prato')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({ ...formData, imageFile, extrasProprios: selectedExclusiveExtras })
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>
          {dish ? 'Editar Prato' : 'Novo Prato'}
        </h2>

        {error && <p style={{ color: 'var(--ui-danger)', marginBottom: 12, fontSize: 13 }}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nome do Prato *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Preço (MZN) *</label>
              <input
                type="number"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: Number(e.target.value) })}
                className={styles.input}
                min="0"
                step="10"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Imagem {dish ? '(deixar vazio para não alterar)' : '*'}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0])}
                className={styles.input}
              />
              {previewUrl && (
                <div className={styles.imagePreviewBox}>
                  <img
                    src={previewUrl}
                    alt="preview do prato"
                    className={styles.imagePreview}
                  />
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Extras gerais (aplicam-se a todos os pratos)</label>
            {globalExtras.length > 0 ? (
              <div className={styles.extraChips}>
                {globalExtras.map((extra) => (
                  <span key={extra._id} className={styles.extraChipMuted}>
                    {extra.nome} · {formatPrice(extra.preco)}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.helperText}>Nenhum extra geral cadastrado.</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Extras específicos deste prato</label>
            {exclusiveExtras.length > 0 ? (
              <div className={styles.extraList}>
                {exclusiveExtras.map((extra) => {
                  const checked = selectedExclusiveExtras.includes(extra._id)
                  return (
                    <label key={extra._id} className={styles.extraOption}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleExclusiveExtra(extra._id)}
                      />
                      <span>{extra.nome} · {formatPrice(extra.preco)}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <p className={styles.helperText}>Nenhum extra específico disponível. Crie extras como "Exclusivo" na secção Extras.</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.disponivel}
                onChange={(e) => setFormData({ ...formData, disponivel: e.target.checked })}
              />
              <span className={styles.label} style={{ margin: 0 }}>Disponível hoje</span>
            </label>
          </div>

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'A guardar...' : dish ? 'Salvar Alterações' : 'Adicionar Prato'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

