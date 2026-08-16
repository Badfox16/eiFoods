import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import Navbar from '../../components/Navbar/Navbar'
import { Button, MenuLine } from '../../components/ui'
import { ordersApi } from '../../api'
import styles from './Checkout.module.css'

const WHATSAPP_NUMERO = '258841234567'

const METODOS = [
  { id: 'mpesa', nome: 'M-Pesa', descricao: 'Vodacom', numero: '84 123 4567', instrucao: 'Abre o M-Pesa, escolhe "Enviar Dinheiro" e transfere para o número acima. Usa o teu nome como referência.' },
  { id: 'emola', nome: 'e-Mola', descricao: 'Movitel', numero: '87 123 4567', instrucao: 'Abre o e-Mola, escolhe "Transferência" e envia para o número acima. Usa o teu nome como referência.' },
  { id: 'banco', nome: 'Transferência bancária', descricao: 'BCI · BIM · Standard', numero: 'BCI 1234 5678 9012', instrucao: 'Transfere para a conta BCI acima. Usa o número do pedido como referência e envia o comprovativo por WhatsApp.' },
]

const TAXA_ENTREGA = 50
const TAXA_FORA_DO_DIA = 50
const PASSOS = ['Pedido', 'Entrega', 'Pagamento']

export default function Checkout() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { orderItems, deliveryDetails } = state

  const [metodo, setMetodo] = useState(null)
  const [criando, setCriando] = useState(false)
  const [orderId, setOrderId] = useState(state.orderId ?? null)
  const [erroApi, setErroApi] = useState(null)

  useEffect(() => {
    if (orderItems.length === 0) navigate('/menu')
  }, [orderItems.length, navigate])

  if (orderItems.length === 0) return null

  const subtotal = orderItems.reduce((acc, item) => acc + (item.total * Math.max(1, item.quantity ?? 1)), 0)
  const itensForaDoDia = orderItems.reduce((acc, item) => item.isForaDoDia ? acc + Math.max(1, item.quantity ?? 1) : acc, 0)
  const taxaForaDoDia = itensForaDoDia * TAXA_FORA_DO_DIA
  const total = subtotal + TAXA_ENTREGA + taxaForaDoDia
  const metodoSelecionado = METODOS.find((m) => m.id === metodo)

  async function criarPedidoSeNecessario() {
    if (orderId) return orderId
    setCriando(true)
    setErroApi(null)
    try {
      const payload = {
        items: orderItems.flatMap((item) => {
          const qty = Math.max(1, item.quantity ?? 1)
          const itemPayload = {
            pratoId: item.prato._id,
            customizations: { free: item.customizations.free ?? [], salt: item.customizations.salt ?? 'Normal' },
            extraIds: Array.isArray(item.customizations.paid)
              ? item.customizations.paid.map((e) => e._id)
              : item.customizations.paid?._id ? [item.customizations.paid._id] : [],
          }
          return Array.from({ length: qty }, () => itemPayload)
        }),
        deliveryDetails,
        empresaCodigo: state.empresaCodigo || undefined,
      }
      const order = await ordersApi.create(payload)
      dispatch({ type: 'SET_ORDER_ID', payload: order._id })
      setOrderId(order._id)
      return order._id
    } catch {
      setErroApi('Erro ao registar o pedido. Tenta novamente.')
      return null
    } finally {
      setCriando(false)
    }
  }

  async function handleEnviarComprovativo() {
    const id = await criarPedidoSeNecessario()
    const ref = id ? `#${id.slice(-8).toUpperCase()}` : ''
    const msg = encodeURIComponent(
      `Ola Marmita Fresca. Efetuei o pagamento do meu pedido.\n\n` +
      `Pedido: ${ref}\nNome: ${deliveryDetails.name}\nLocal: ${deliveryDetails.location}\n` +
      `Metodo: ${metodoSelecionado?.nome}\nTotal: ${total} MT\n\nSegue o comprovativo em anexo.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`, '_blank')
    navigate('/confirmation')
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        {/* Progresso */}
        <ol className={styles.progresso}>
          {PASSOS.map((p, i) => (
            <li key={p} className={`${styles.passo} ${i < 2 ? styles.passoFeito : ''} ${i === 2 ? styles.passoAtivo : ''}`}>
              <span className={styles.passoN}>{i + 1}</span>{p}
            </li>
          ))}
        </ol>

        <div className={styles.layout}>
          <div className={styles.esq}>
            <h2 className={styles.secaoTitulo}>Como queres pagar?</h2>
            <div className={styles.metodos}>
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  className={`${styles.metodo} ${metodo === m.id ? styles.metodoAtivo : ''}`}
                  onClick={() => setMetodo(m.id)}
                >
                  <span className={styles.radio} aria-hidden="true" />
                  <span className={styles.metodoTexto}>
                    <span className={styles.metodoNome}>{m.nome}</span>
                    <span className={styles.metodoDesc}>{m.descricao}</span>
                  </span>
                </button>
              ))}
            </div>

            {metodoSelecionado && (
              <div className={styles.instrucoes}>
                <div className={styles.instrucoesTopo}>
                  <div>
                    <span className={styles.instrucoesLabel}>Enviar para</span>
                    <span className={styles.instrucoesNumero}>{metodoSelecionado.numero}</span>
                  </div>
                  <div className={styles.instrucoesValor}>
                    <span className={styles.instrucoesLabel}>Montante</span>
                    <span className={styles.instrucoesMontante}>{total}<span>MT</span></span>
                  </div>
                </div>
                <p className={styles.instrucoesTxt}>{metodoSelecionado.instrucao}</p>
              </div>
            )}

            {erroApi && <div className={styles.erroApi}>{erroApi}</div>}

            <Button
              variant="primary"
              size="large"
              fullWidth
              disabled={!metodo}
              loading={criando}
              onClick={handleEnviarComprovativo}
            >
              Enviar comprovativo por WhatsApp
            </Button>
            {!metodo && <p className={styles.dica}>Escolhe um método de pagamento para continuar.</p>}
          </div>

          {/* Talão */}
          <aside className={styles.talao}>
            <span className={styles.talaoTitulo}>Resumo</span>
            <p className={styles.talaoLocal}>{deliveryDetails.location || 'Local não definido'}</p>
            <div className={styles.talaoLinhas}>
              {orderItems.map((item, i) => (
                <MenuLine
                  key={i}
                  name={item.prato.nome}
                  note={`${Math.max(1, item.quantity ?? 1)}×`}
                  price={item.total * Math.max(1, item.quantity ?? 1)}
                />
              ))}
            </div>
            <div className={styles.talaoTaxas}>
              <MenuLine name="Subtotal" price={subtotal} />
              <MenuLine name="Taxa de entrega" price={TAXA_ENTREGA} />
              {itensForaDoDia > 0 && <MenuLine name="Fora do dia" price={taxaForaDoDia} />}
            </div>
            <div className={styles.talaoTotal}>
              <MenuLine name="Total" price={total} strong />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
