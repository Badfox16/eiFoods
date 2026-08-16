import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useOrder } from '../../context/useOrder'
import Navbar from '../../components/Navbar/Navbar'
import { Button, MenuLine } from '../../components/ui'
import styles from './OrderSummary.module.css'

const TAXA_ENTREGA = 50
const TAXA_FORA_DO_DIA = 50

function resumoTags(item) {
  const pagos = Array.isArray(item.customizations.paid)
    ? item.customizations.paid.map((e) => e.nome)
    : item.customizations.paid?.nome ? [item.customizations.paid.nome] : []
  return [
    ...item.customizations.free,
    item.customizations.salt !== 'Normal' && `sal ${item.customizations.salt.toLowerCase()}`,
    ...pagos,
  ].filter(Boolean).join(' · ')
}

export default function OrderSummary() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { orderItems } = state

  useEffect(() => {
    if (orderItems.length === 0) navigate('/menu')
  }, [orderItems.length, navigate])

  if (orderItems.length === 0) return null

  const totalItens = orderItems.reduce((acc, item) => acc + Math.max(1, item.quantity ?? 1), 0)
  const subtotal = orderItems.reduce((acc, item) => acc + (item.total * Math.max(1, item.quantity ?? 1)), 0)
  const itensForaDoDia = orderItems.reduce((acc, item) => item.isForaDoDia ? acc + Math.max(1, item.quantity ?? 1) : acc, 0)
  const taxaForaDoDia = itensForaDoDia * TAXA_FORA_DO_DIA
  const total = subtotal + TAXA_ENTREGA + taxaForaDoDia

  function editar(index) {
    const item = orderItems[index]
    dispatch({ type: 'SELECT_DISH', payload: item.prato })
    dispatch({ type: 'SET_CUSTOMIZATION', payload: item.customizations })
    navigate('/customize', { state: { editIndex: index } })
  }

  function quantidade(index, delta) {
    const atual = Math.max(1, orderItems[index]?.quantity ?? 1)
    const proximo = atual + delta
    if (proximo < 1) return
    dispatch({ type: 'UPDATE_ITEM_QUANTITY', payload: { index, quantity: proximo } })
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.header}>
          <button className={styles.voltar} onClick={() => navigate('/menu')}>← Continuar a escolher</button>
          <h1 className={styles.title}>O meu pedido <span className={styles.count}>{totalItens}</span></h1>
        </div>

        <div className={styles.layout}>
          {/* Itens */}
          <div className={styles.itens}>
            {orderItems.map((item, index) => {
              const tags = resumoTags(item)
              const qty = Math.max(1, item.quantity ?? 1)
              return (
                <div key={index} className={styles.item}>
                  <div className={styles.itemImgWrap}>
                    {item.prato.imagem
                      ? <img src={item.prato.imagem?.url ?? item.prato.imagem} alt={item.prato.nome} className={styles.itemImg} />
                      : <div className={styles.itemImgFallback} />}
                  </div>
                  <div className={styles.itemCorpo}>
                    <div className={styles.itemTopo}>
                      <span className={styles.itemNome}>{item.prato.nome}</span>
                      <span className={styles.itemPreco}>{item.total * qty}<span>MT</span></span>
                    </div>
                    <p className={styles.itemTags}>{tags || 'Sem personalização'}{item.isForaDoDia ? ' · fora do dia' : ''}</p>
                    <div className={styles.itemAcoes}>
                      <div className={styles.qtd}>
                        <button onClick={() => quantidade(index, -1)} aria-label="Menos um">−</button>
                        <span>{qty}</span>
                        <button onClick={() => quantidade(index, 1)} aria-label="Mais um">+</button>
                      </div>
                      <button className={styles.acaoLink} onClick={() => editar(index)}>Editar</button>
                      <button className={styles.acaoLink} onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: index })}>Remover</button>
                    </div>
                  </div>
                </div>
              )
            })}
            <button className={styles.adicionar} onClick={() => navigate('/menu')}>+ Adicionar outro prato</button>
          </div>

          {/* Talão */}
          <aside className={styles.talao}>
            <span className={styles.talaoTitulo}>Talão</span>
            <div className={styles.talaoLinhas}>
              <MenuLine name={`Subtotal · ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`} price={subtotal} />
              <MenuLine name="Taxa de entrega" price={TAXA_ENTREGA} />
              {itensForaDoDia > 0 && (
                <MenuLine name={`Fora do dia · ${itensForaDoDia}`} price={taxaForaDoDia} />
              )}
            </div>
            <div className={styles.talaoTotal}>
              <MenuLine name="Total" price={total} strong />
            </div>
            <Button fullWidth size="large" onClick={() => navigate('/delivery')}>Dados de entrega</Button>
            <p className={styles.nota}>Entrega às 12h no teu local de trabalho. Confirmamos por WhatsApp.</p>
          </aside>
        </div>
      </main>
    </div>
  )
}
