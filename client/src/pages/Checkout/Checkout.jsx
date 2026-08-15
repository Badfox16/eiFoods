import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import Navbar from '../../components/Navbar/Navbar'
import { ordersApi } from '../../api'
import styles from './Checkout.module.css'

const WHATSAPP_NUMERO = '258841234567'

const METODOS = [
  {
    id: 'mpesa',
    nome: 'M-Pesa',
    descricao: 'Vodacom Moçambique',
    numero: '84 123 4567',
    instrucao: 'Abra o M-Pesa, selecione "Enviar Dinheiro" e transfira para o número acima. Use o seu nome como referência.',
    cor: '#E32B30',
    icone: (
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="#E32B30"/>
        <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">M</text>
      </svg>
    ),
  },
  {
    id: 'emola',
    nome: 'eMola',
    descricao: 'Movitel Moçambique',
    numero: '87 123 4567',
    instrucao: 'Abra o eMola, selecione "Transferência" e envie para o número acima. Use o seu nome como referência.',
    cor: '#6B2D8B',
    icone: (
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="#6B2D8B"/>
        <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">e</text>
      </svg>
    ),
  },
  {
    id: 'banco',
    nome: 'Transferência Bancária',
    descricao: 'BCI · BIM · Standard Bank',
    numero: 'BCI: 1234 5678 9012',
    instrucao: 'Faça a transferência para a conta BCI acima. Use o número do pedido como referência e envie o comprovativo pelo WhatsApp.',
    cor: '#1A3D6E',
    icone: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="22" height="22" rx="11" fill="#1A3D6E" stroke="none"/>
        <path d="M6 12h12M12 6v12" stroke="white" strokeWidth="2"/>
      </svg>
    ),
  },
]

const TAXA_ENTREGA = 50
const TAXA_FORA_DO_DIA = 50

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
  const itensForaDoDia = orderItems.reduce((acc, item) => {
    if (!item.isForaDoDia) return acc
    return acc + Math.max(1, item.quantity ?? 1)
  }, 0)
  const taxaForaDoDia = itensForaDoDia * TAXA_FORA_DO_DIA
  const total = subtotal + TAXA_ENTREGA + taxaForaDoDia

  const metodoSelecionado = METODOS.find(m => m.id === metodo)

  async function criarPedidoSeNecessario() {
    if (orderId) return orderId
    setCriando(true)
    setErroApi(null)
    try {
      const payload = {
        items: orderItems.flatMap(item => {
          const qty = Math.max(1, item.quantity ?? 1)
          const itemPayload = {
            pratoId: item.prato._id,
            customizations: {
              free: item.customizations.free ?? [],
              salt: item.customizations.salt ?? 'Normal',
            },
            extraIds: Array.isArray(item.customizations.paid)
              ? item.customizations.paid.map(e => e._id)
              : item.customizations.paid?._id ? [item.customizations.paid._id] : [],
          }
          return Array.from({ length: qty }, () => itemPayload)
        }),
        deliveryDetails,
        // empresa em standby — empresaCodigo fica vazio no fluxo atual (envia undefined)
        empresaCodigo: state.empresaCodigo || undefined,
      }
      const order = await ordersApi.create(payload)
      dispatch({ type: 'SET_ORDER_ID', payload: order._id })
      setOrderId(order._id)
      return order._id
    } catch (e) {
      setErroApi('Erro ao registar o pedido. Tente novamente.')
      return null
    } finally {
      setCriando(false)
    }
  }

  async function handleEnviarComprovativo() {
    const id = await criarPedidoSeNecessario()
    const ref = id ? `#${id.slice(-8).toUpperCase()}` : ''
    const msg = encodeURIComponent(
      `Olá eiFoods! 👋\n\nAcabei de efectuar o pagamento do meu pedido.\n\n` +
      `📦 Pedido: ${ref}\n` +
      `👤 Nome: ${deliveryDetails.name}\n` +
      `📍 Local: ${deliveryDetails.location}\n` +
      `💳 Método: ${metodoSelecionado?.nome}\n` +
      `💰 Total pago: ${total} MZN\n\n` +
      `Segue o comprovativo de pagamento em anexo.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMERO}?text=${msg}`, '_blank')
    navigate('/confirmation')
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>

        {/* Progresso */}
        <div className={styles.progresso}>
          <div className={styles.progressoStep}>
            <span className={styles.progressoNum + ' ' + styles.progressoFeito}>1</span>
            <span className={styles.progressoLabel}>Carrinho</span>
          </div>
          <div className={styles.progressoLinha + ' ' + styles.progressoLinhaFeita} />
          <div className={styles.progressoStep}>
            <span className={styles.progressoNum + ' ' + styles.progressoFeito}>2</span>
            <span className={styles.progressoLabel}>Entrega</span>
          </div>
          <div className={styles.progressoLinha + ' ' + styles.progressoLinhaFeita} />
          <div className={styles.progressoStep}>
            <span className={styles.progressoNum + ' ' + styles.progressoAtivo}>3</span>
            <span className={styles.progressoLabel + ' ' + styles.progressoLabelAtivo}>Pagamento</span>
          </div>
        </div>

        <div className={styles.layout}>

          {/* Coluna principal */}
          <div className={styles.colunaEsq}>

            <div className={styles.secao}>
              <h2 className={styles.secaoTitulo}>Como deseja pagar?</h2>
              <div className={styles.metodos}>
                {METODOS.map(m => (
                  <button
                    key={m.id}
                    className={`${styles.metodoCard} ${metodo === m.id ? styles.metodoCardAtivo : ''}`}
                    style={metodo === m.id ? { '--metodo-cor': m.cor } : {}}
                    onClick={() => setMetodo(m.id)}
                  >
                    <span className={styles.metodoIcone}>{m.icone}</span>
                    <div className={styles.metodoTexto}>
                      <span className={styles.metodoNome}>{m.nome}</span>
                      <span className={styles.metodoDesc}>{m.descricao}</span>
                    </div>
                    <span className={styles.metodoCheck}>
                      {metodo === m.id && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Instruções de pagamento */}
            {metodoSelecionado && (
              <div className={styles.instrucoes} style={{ '--metodo-cor': metodoSelecionado.cor }}>
                <div className={styles.instrucoesHeader}>
                  <span className={styles.instrucoesIcone}>{metodoSelecionado.icone}</span>
                  <div>
                    <p className={styles.instrucoesLabel}>Enviar para</p>
                    <p className={styles.instrucoesNumero}>{metodoSelecionado.numero}</p>
                  </div>
                </div>
                <div className={styles.instrucoesValor}>
                  <span className={styles.instrucoesValorLabel}>Montante a pagar</span>
                  <span className={styles.instrucoesValorNum}>{total} MZN</span>
                </div>
                <p className={styles.instrucoesTxt}>{metodoSelecionado.instrucao}</p>
              </div>
            )}

            {erroApi && (
              <div className={styles.erroApi}>{erroApi}</div>
            )}

            <button
              className={styles.btnWhatsapp}
              disabled={!metodo || criando}
              onClick={handleEnviarComprovativo}
            >
              {criando ? (
                <span className={styles.btnSpinner} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              {criando ? 'A registar pedido...' : 'Enviar comprovativo no WhatsApp'}
            </button>

            {!metodo && (
              <p className={styles.dica}>Selecione um método de pagamento para continuar</p>
            )}

          </div>

          {/* Resumo */}
          <div className={styles.colunaDireita}>
            <div className={styles.resumoCard}>
              <h3 className={styles.resumoTitulo}>Resumo do pedido</h3>

              <div className={styles.resumoEntrega}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{deliveryDetails.location || 'Local não definido'}</span>
              </div>

              <ul className={styles.resumoItens}>
                {orderItems.map((item, i) => (
                  <li key={i} className={styles.resumoItem}>
                    <span className={styles.resumoItemNome}>{item.prato.nome} · {Math.max(1, item.quantity ?? 1)}x</span>
                    <span className={styles.resumoItemPreco}>{item.total * Math.max(1, item.quantity ?? 1)} MZN</span>
                  </li>
                ))}
              </ul>

              <div className={styles.resumoLinhas}>
                <div className={styles.resumoLinha}>
                  <span>Subtotal</span>
                  <span>{subtotal} MZN</span>
                </div>
                <div className={styles.resumoLinha}>
                  <span>Taxa de entrega</span>
                  <span>{TAXA_ENTREGA} MZN</span>
                </div>
                {itensForaDoDia > 0 && (
                  <div className={styles.resumoLinha}>
                    <span>Taxa fora do dia</span>
                    <span>{taxaForaDoDia} MZN</span>
                  </div>
                )}
              </div>

              <div className={styles.resumoTotal}>
                <span>Total</span>
                <span className={styles.resumoTotalValor}>{total} MZN</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
