import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import Navbar from '../../components/Navbar/Navbar'
import { Button, MenuLine } from '../../components/ui'
import styles from './Confirmation.module.css'

function groupOrderItems(orderItems) {
  const map = new Map()
  for (const item of orderItems) {
    const free = item.customizations?.free ?? []
    const salt = item.customizations?.salt ?? 'Normal'
    const paid = Array.isArray(item.customizations?.paid)
      ? item.customizations.paid.map((p) => p.nome)
      : item.customizations?.paid?.nome ? [item.customizations.paid.nome] : []
    const unitPrice = item.total
    const quantity = Math.max(1, item.quantity ?? 1)
    const key = JSON.stringify({ pratoId: item.prato?._id ?? item.prato?.nome, free, salt, paid, unitPrice })
    const existing = map.get(key)
    if (existing) {
      existing.quantity += quantity
      existing.lineTotal += unitPrice * quantity
    } else {
      map.set(key, { key, pratoNome: item.prato?.nome ?? 'Prato', free, salt, paid, quantity, unitPrice, lineTotal: unitPrice * quantity })
    }
  }
  return Array.from(map.values())
}

function resumoMeta(item) {
  const partes = []
  if (item.free.length) partes.push(item.free.join(', '))
  if (item.salt !== 'Normal') partes.push(`sal ${item.salt.toLowerCase()}`)
  if (item.paid.length) partes.push(item.paid.join(', '))
  return partes.join(' · ')
}

export default function Confirmation() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { orderItems, deliveryDetails, orderId } = state

  useEffect(() => {
    if (orderItems.length === 0) navigate('/menu')
  }, [orderItems.length, navigate])

  if (orderItems.length === 0) return null

  const grupos = groupOrderItems(orderItems)
  const total = grupos.reduce((acc, item) => acc + item.lineTotal, 0)

  function novoPedido() {
    dispatch({ type: 'RESET_ORDER' })
    navigate('/')
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.talao}>
          <div className={styles.carimbo}>Registado</div>

          <h1 className={styles.titulo}>Comprovativo enviado</h1>
          <p className={styles.sub}>
            Assim que confirmarmos o pagamento, o teu pedido entra em preparação.
            Avisamos por WhatsApp.
          </p>

          <div className={styles.meta}>
            {orderId && (
              <div className={styles.metaLinha}>
                <span>Referência</span>
                <span className={styles.metaVal}>#{orderId.slice(-8).toUpperCase()}</span>
              </div>
            )}
            <div className={styles.metaLinha}>
              <span>Entrega</span>
              <span className={styles.metaVal}>hoje às 12h</span>
            </div>
            <div className={styles.metaLinha}>
              <span>Local</span>
              <span className={styles.metaVal}>{deliveryDetails.location || '—'}</span>
            </div>
          </div>

          <div className={styles.linhas}>
            {grupos.map((item) => (
              <MenuLine
                key={item.key}
                name={item.pratoNome}
                note={[`${item.quantity}×`, resumoMeta(item)].filter(Boolean).join(' · ')}
                price={item.lineTotal}
              />
            ))}
          </div>
          <div className={styles.total}>
            <MenuLine name="Total" price={total} strong />
          </div>

          <p className={styles.obrigado}>
            Obrigado, <strong>{deliveryDetails.name || 'cliente'}</strong>.
          </p>

          <Button variant="outline" size="large" fullWidth onClick={novoPedido}>Fazer novo pedido</Button>
        </div>
      </main>
    </div>
  )
}
