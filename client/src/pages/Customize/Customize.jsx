import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { extrasApi, scheduleApi } from '../../api'
import { useOrder } from '../../context/useOrder'
import { useToast } from '../../context/toast'
import Navbar from '../../components/Navbar/Navbar'
import { OPCOES_MOLHO, OPCOES_PIRIPIRI, OPCOES_SAL } from '../../data/menuData'
import { Button } from '../../components/ui'
import styles from './Customize.module.css'

export default function Customize() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, dispatch } = useOrder()
  const { showToast } = useToast()
  const { selectedDish, customizations, orderItems } = state

  const editIndex = location.state?.editIndex ?? null
  // Quantidade inicial: 1 para novo item, ou a do item em edição (sync no mount).
  const [quantity, setQuantity] = useState(() => {
    if (editIndex === null) return 1
    return Math.max(1, orderItems[editIndex]?.quantity ?? 1)
  })
  const [extrasDisponiveis, setExtrasDisponiveis] = useState([])
  const [pratoDoDiaId, setPratoDoDiaId] = useState(null)

  useEffect(() => {
    if (selectedDish?._id) {
      extrasApi.listForPrato(selectedDish._id).then(setExtrasDisponiveis).catch(() => {})
    }
  }, [selectedDish?._id])

  useEffect(() => {
    scheduleApi.getHoje().then((d) => setPratoDoDiaId(d?.prato?._id ?? null)).catch(() => setPratoDoDiaId(null))
  }, [])

  useEffect(() => {
    if (!selectedDish) navigate('/menu')
  }, [selectedDish, navigate])

  if (!selectedDish) return null

  // paid é sempre array
  const extrasSelecionados = Array.isArray(customizations.paid) ? customizations.paid : []
  const totalExtras = extrasSelecionados.reduce((acc, e) => acc + e.preco, 0)
  const totalPrato = selectedDish.preco + totalExtras
  const isForaDoDia = Boolean(pratoDoDiaId) && selectedDish._id !== pratoDoDiaId

  // Toggle exclusivo dentro de um grupo (molho ou piripiri)
  function toggleExclusivo(opcao, grupo) {
    const semGrupo = customizations.free.filter(o => !grupo.includes(o))
    if (customizations.free.includes(opcao)) {
      dispatch({ type: 'SET_CUSTOMIZATION', payload: { free: semGrupo } })
    } else {
      dispatch({ type: 'SET_CUSTOMIZATION', payload: { free: [...semGrupo, opcao] } })
    }
  }

  function handleSal(opcao) {
    dispatch({ type: 'SET_CUSTOMIZATION', payload: { salt: opcao } })
  }

  // Toggle múltiplo para extras pagos
  function handlePago(extra) {
    const jaSelecionado = extrasSelecionados.some(e => e._id === extra._id)
    const novos = jaSelecionado
      ? extrasSelecionados.filter(e => e._id !== extra._id)
      : [...extrasSelecionados, extra]
    dispatch({ type: 'SET_CUSTOMIZATION', payload: { paid: novos } })
  }

  function handleAdicionar() {
    const novoItem = {
      prato: selectedDish,
      customizations: { ...customizations, paid: extrasSelecionados },
      isForaDoDia,
      foraDoDiaTaxa: isForaDoDia ? 50 : 0,
      total: totalPrato,
      quantity,
    }

    if (editIndex !== null) {
      dispatch({ type: 'REMOVE_ITEM', payload: editIndex })
    }

    dispatch({ type: 'ADD_TO_ORDER', payload: novoItem })
    showToast(`${selectedDish.nome} adicionado ao pedido!`)
    navigate('/menu')
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        <button
          type="button"
          className={styles.btnVoltar}
          onClick={() => navigate('/menu')}
        >
          ← Voltar ao menu
        </button>

        {/* Prato seleccionado */}
        <div className={styles.pratoSeleccionado}>
          {selectedDish.imagem?.url
            ? <img src={selectedDish.imagem.url} alt={selectedDish.nome} className={styles.pratoImg} />
            : <span className={styles.pratoImgFallback} />
          }
          <div>
            <h1 className={styles.pratoNome}>{selectedDish.nome}</h1>
            <p className={styles.pratoPreco}>
              {selectedDish.preco} MZN
              {extrasSelecionados.length > 0 && (
                <span className={styles.extraPreco}>
                  {' '}+ {totalExtras} MZN = <strong>{totalPrato} MZN</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className={styles.grid}>

          {/* ── Personalização Gratuita ── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Personalização gratuita</h2>

            {/* Molho — exclusivo */}
            <div className={styles.grupo}>
              <p className={styles.grupoLabel}>Molho</p>
              <div className={styles.checkboxLista}>
                {OPCOES_MOLHO.map(opcao => (
                  <label
                    key={opcao}
                    className={`${styles.checkboxItem} ${customizations.free.includes(opcao) ? styles.checkboxItemActivo : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={customizations.free.includes(opcao)}
                      onChange={() => toggleExclusivo(opcao, OPCOES_MOLHO)}
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Picante — exclusivo */}
            <div className={styles.grupo}>
              <p className={styles.grupoLabel}>Picante</p>
              <div className={styles.checkboxLista}>
                {OPCOES_PIRIPIRI.map(opcao => (
                  <label
                    key={opcao}
                    className={`${styles.checkboxItem} ${customizations.free.includes(opcao) ? styles.checkboxItemActivo : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={customizations.free.includes(opcao)}
                      onChange={() => toggleExclusivo(opcao, OPCOES_PIRIPIRI)}
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sal — radio */}
            <div className={styles.grupo}>
              <p className={styles.grupoLabel}>Sal</p>
              <div className={styles.radioLista}>
                {OPCOES_SAL.map(opcao => (
                  <label
                    key={opcao}
                    className={`${styles.radioItem} ${customizations.salt === opcao ? styles.radioItemActivo : ''}`}
                  >
                    <input
                      type="radio"
                      name="sal"
                      checked={customizations.salt === opcao}
                      onChange={() => handleSal(opcao)}
                    />
                    <span>{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Extras Pagos ── */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Extras pagos</h2>

            {extrasDisponiveis.length === 0 ? (
              <p className={styles.semExtras}>Sem extras disponíveis para este prato</p>
            ) : (
              <div className={styles.checkboxLista}>
                {extrasDisponiveis.map(extra => {
                  const selecionado = extrasSelecionados.some(e => e._id === extra._id)
                  return (
                    <label
                      key={extra._id}
                      className={`${styles.checkboxItem} ${styles.checkboxItemExtra} ${selecionado ? styles.checkboxItemActivo : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => handlePago(extra)}
                      />
                      <span className={styles.extraNome}>{extra.nome}</span>
                      <span className={styles.extraPrecoBadge}>+{extra.preco} MZN</span>
                    </label>
                  )
                })}
              </div>
            )}

            {extrasSelecionados.length > 0 && (
              <div className={styles.extrasTotal}>
                <span>Total extras</span>
                <strong>+{totalExtras} MZN</strong>
              </div>
            )}
          </div>

        </div>

        {isForaDoDia && (
          <div className={styles.extrasTotal}>
            <span>Taxa prato fora do dia</span>
            <strong>+50 MZN (cobrada no checkout)</strong>
          </div>
        )}

        <div className={styles.quantidade}>
          <span className={styles.quantidadeLabel}>Quantidade</span>
          <div className={styles.qtd}>
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Menos um">−</button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Mais um">+</button>
          </div>
        </div>

        <Button size="large" fullWidth onClick={handleAdicionar}>
          {editIndex !== null ? 'Guardar alterações' : `Adicionar ao pedido · ${totalPrato * quantity} MT`}
        </Button>

      </main>
    </div>
  )
}
