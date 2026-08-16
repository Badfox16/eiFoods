import { useState } from 'react'
import { useAdmin } from '../../context/useAdmin'
import { Header, Card } from '../../components'
import { formatPrice } from '../../../../shared/utils'
import type { DiaSemana } from '../../../../shared/types'
import styles from './PratoDoDia.module.css'

const DIA_LABELS: Record<DiaSemana, string> = {
  segunda: 'Segunda-Feira',
  terca: 'Terça-Feira',
  quarta: 'Quarta-Feira',
  quinta: 'Quinta-Feira',
  sexta: 'Sexta-Feira',
  sabado: 'Sábado',
}

const DIAS_ORDEM: DiaSemana[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

function getTodayDia(): DiaSemana | null {
  const day = new Date().getDay() // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sab
  return DIAS_ORDEM[day - 1] ?? null
}

export function PratoDoDia() {
  const { state, setDayPrato } = useAdmin()
  const [saving, setSaving] = useState<DiaSemana | null>(null)
  const [error, setError] = useState<string | null>(null)
  const todayDia = getTodayDia()

  const handleDayChange = async (dia: DiaSemana, pratoId: string) => {
    setSaving(dia)
    setError(null)
    try {
      await setDayPrato(dia, pratoId || null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(null)
    }
  }

  if (state.loading) return <div style={{ padding: 32 }}>A carregar...</div>

  return (
    <div className={styles.page}>
      <Header
        title="Prato do Dia"
        subtitle="Agenda semanal — configure o prato em destaque para cada dia"
      />

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button className={styles.errorClose} onClick={() => setError(null)} aria-label="Fechar erro">×</button>
        </div>
      )}

      <div className={styles.semanaGrid}>
        {DIAS_ORDEM.map(dia => {
          const diaAgendado = state.schedule?.semana.find(d => d.diaSemana === dia)
          const pratoAtual = diaAgendado?.prato
          const isToday = dia === todayDia
          const isSaving = saving === dia

          return (
            <Card
              key={dia}
              className={`${styles.diaCard}${isToday ? ' ' + styles.diaCardHoje : ''}`}
            >
              <div className={styles.diaHeader}>
                <h3 className={styles.diaNome}>{DIA_LABELS[dia]}</h3>
                {isToday && (
                    <span className={styles.hojeBadge}>Hoje</span>
                )}
              </div>

              {pratoAtual ? (
                <div className={styles.pratoInfo}>
                  {pratoAtual.imagem?.url && (
                    <img
                      src={pratoAtual.imagem.url}
                      alt={pratoAtual.nome}
                      className={styles.pratoImagem}
                    />
                  )}
                  <div>
                    <p className={styles.pratoNome}>{pratoAtual.nome}</p>
                    <p className={styles.pratoPreco}>{formatPrice(pratoAtual.preco)}</p>
                  </div>
                </div>
              ) : (
                <p className={styles.semPrato}>Sem prato agendado</p>
              )}

              <div className={styles.selecionarWrap}>
                <select
                  className={styles.selectPrato}
                  value={pratoAtual?._id ?? ''}
                  onChange={(e) => handleDayChange(dia, e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">— Sem prato —</option>
                  {state.pratos.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.nome}{!p.disponivel ? ' (indisponível)' : ''}
                    </option>
                  ))}
                </select>
                {isSaving && (
                  <span className={styles.saving}>A guardar...</span>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {!state.schedule && !state.loading && (
        <Card>
          <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ui-text-2)' }}>
            Agenda não encontrada — verifique a ligação ao servidor
          </h3>
        </Card>
      )}
    </div>
  )
}
