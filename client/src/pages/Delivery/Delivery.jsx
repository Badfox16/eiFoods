import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/Navbar/Navbar'
import { Button, Input } from '../../components/ui'
import styles from './Delivery.module.css'

export default function Delivery() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { cliente } = useAuth()

  const [form, setForm] = useState({
    name: state.deliveryDetails.name || cliente?.nome || '',
    company: state.deliveryDetails.company || '',
    location: state.deliveryDetails.location || '',
    contact: state.deliveryDetails.contact || (cliente?.telefone ? cliente.telefone.replace(/^258/, '') : ''),
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (state.orderItems.length === 0) navigate('/menu')
  }, [state.orderItems.length, navigate])

  if (state.orderItems.length === 0) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const novos = {}
    if (!form.name.trim()) novos.name = 'Nome é obrigatório'
    if (!form.location.trim()) novos.location = 'Local de entrega é obrigatório'
    if (!form.contact.trim()) novos.contact = 'Contacto é obrigatório'
    if (Object.keys(novos).length) { setErrors(novos); return }
    dispatch({ type: 'SET_DELIVERY_DETAILS', payload: form })
    navigate('/checkout')
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <button className={styles.voltar} onClick={() => navigate('/order-summary')}>← Voltar ao pedido</button>
        <h1 className={styles.title}>Dados de entrega</h1>
        <p className={styles.sub}>Onde e para quem entregamos. Confirmamos por WhatsApp.</p>

        <form className={styles.card} onSubmit={handleSubmit}>
          <Input
            label="Nome *"
            name="name"
            placeholder="O teu nome completo"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <Input
            label="Local de trabalho (opcional)"
            name="company"
            placeholder="Ex.: nome do escritório"
            value={form.company}
            onChange={handleChange}
          />
          <Input
            label="Local de entrega *"
            name="location"
            placeholder="Ex.: Escritório, 3.º andar, receção…"
            value={form.location}
            onChange={handleChange}
            error={errors.location}
          />
          <Input
            label="Contacto *"
            name="contact"
            type="tel"
            inputMode="numeric"
            placeholder="Número de telefone"
            value={form.contact}
            onChange={handleChange}
            error={errors.contact}
          />
          <Button type="submit" size="large" fullWidth>Continuar para pagamento</Button>
        </form>
      </main>
    </div>
  )
}
