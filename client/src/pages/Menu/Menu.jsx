import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import { useAuth } from '../../context/useAuth'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Spinner, MenuLine } from '../../components/ui'
import { menuApi, planoMenuApi } from '../../api'
import { CATEGORIA_LABEL } from '../../../../shared/constants'
import styles from './Menu.module.css'

function dataDeHoje() {
  const t = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function resumoItem(item) {
  const partes = []
  if (item.customizations?.free?.length) partes.push(item.customizations.free.join(', '))
  if (item.customizations?.salt && item.customizations.salt !== 'Normal') partes.push(`sal ${item.customizations.salt.toLowerCase()}`)
  const pagos = Array.isArray(item.customizations?.paid)
    ? item.customizations.paid.map((e) => e.nome)
    : item.customizations?.paid?.nome ? [item.customizations.paid.nome] : []
  if (pagos.length) partes.push(pagos.join(', '))
  return partes.join(' · ')
}

const CATEGORIAS_COM_MENU_PROPRIO = new Set(['premium_fit_starter', 'premium_muscle', 'premium_equilibrio'])

export default function Menu() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { premium, categoriaAtiva } = useAuth()
  const { orderItems } = state
  const menuPremium = CATEGORIAS_COM_MENU_PROPRIO.has(categoriaAtiva)

  const [pratos, setPratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')

  // Cliente com uma subscrição premium ativa (Fase 7) vê só o cardápio
  // próprio do seu plano (Fit Starter/Muscle) — não o menu normal do dia.
  const carregarMenu = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const menu = menuPremium ? await planoMenuApi.get(categoriaAtiva) : await menuApi.getHoje()
      const lista = (Array.isArray(menu?.itens) ? menu.itens : [])
        .map((i) => (typeof i.pratoId === 'object' && i.pratoId
          ? { ...i.pratoId, destaque: menuPremium ? false : Boolean(i.destaque), exclusivo: menuPremium ? false : Boolean(i.exclusivo) }
          : null))
        .filter(Boolean)
      setPratos(lista)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [menuPremium, categoriaAtiva])

  useEffect(() => {
    void carregarMenu()
  }, [carregarMenu])

  const filtrados = pratos.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(busca.toLowerCase())
  )
  const normais = filtrados.filter((p) => !p.exclusivo)
  const exclusivos = filtrados.filter((p) => p.exclusivo)

  function selecionar(prato) {
    if (prato.exclusivo && !premium) { navigate('/planos'); return }
    dispatch({ type: 'SELECT_DISH', payload: prato })
    navigate('/customize')
  }

  const totalItens = orderItems.reduce((acc, i) => acc + Math.max(1, i.quantity ?? 1), 0)
  const totalPedido = orderItems.reduce((acc, i) => acc + (i.total * Math.max(1, i.quantity ?? 1)), 0)

  return (
    <div className={styles.page}>
      <Navbar />

      <section className={styles.topo}>
        <div className={styles.topoInner}>
          <div>
            <span className={styles.kicker}>
              {menuPremium ? `O teu plano · ${CATEGORIA_LABEL[categoriaAtiva]}` : `O quadro de hoje · ${dataDeHoje()}`}
            </span>
            <h1 className={styles.titulo}>{menuPremium ? 'O teu cardápio' : 'Menu de hoje'}</h1>
          </div>
          <div className={styles.busca}>
            <input
              className={styles.buscaInput}
              type="text"
              placeholder="Procurar prato…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Procurar prato"
            />
            {busca && <button className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar">×</button>}
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <main className={styles.main}>
          {loading ? (
            <div className={styles.estado}><Spinner size="large" /></div>
          ) : error ? (
            <div className={styles.estado}>
              <p className={styles.estadoTexto}>Não foi possível carregar o menu.</p>
              <p className={styles.estadoSub}>{error}</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className={styles.estado}>
              <p className={styles.estadoTexto}>
                {busca
                  ? `Sem resultados para "${busca}".`
                  : menuPremium
                    ? 'O cardápio do teu plano ainda não foi publicado.'
                    : 'O menu de hoje ainda não foi publicado.'}
              </p>
              <p className={styles.estadoSub}>{busca ? 'Tenta outra procura.' : 'Volta mais logo.'}</p>
            </div>
          ) : (
            <>
              {normais.length > 0 && (
                <div className={styles.board}>
                  {normais.map((p) => (
                    <MenuLine
                      key={p._id}
                      thumb={p.imagem?.url}
                      thumbBadge={p.destaque ? 'Hoje' : undefined}
                      name={p.nome}
                      note={p.descricao}
                      price={p.preco}
                      onClick={() => selecionar(p)}
                    />
                  ))}
                </div>
              )}

              {exclusivos.length > 0 && (
                <section className={styles.exclusivos}>
                  <div className={styles.exclusivosHead}>
                    <h2 className={styles.exclusivosTitulo}>Exclusivos</h2>
                    <span className={styles.exclusivosSub}>
                      {premium ? 'Reservados ao teu plano premium' : 'Só para clientes com plano premium ativo'}
                    </span>
                  </div>
                  <div className={styles.board}>
                    {exclusivos.map((p) => (
                      <MenuLine
                        key={p._id}
                        thumb={p.imagem?.url}
                        name={p.nome}
                        note={p.descricao}
                        price={premium ? p.preco : undefined}
                        locked={!premium}
                        action={premium
                          ? undefined
                          : <button className={styles.desbloquear} onClick={() => navigate('/planos')}>Desbloquear</button>}
                        onClick={premium ? () => selecionar(p) : undefined}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>

        {/* ── Talão (carrinho) ── */}
        <aside className={styles.talao}>
          <div className={styles.talaoHead}>
            <span className={styles.talaoTitulo}>O meu pedido</span>
            {totalItens > 0 && <span className={styles.talaoCount}>{totalItens}</span>}
          </div>

          {orderItems.length === 0 ? (
            <p className={styles.talaoVazio}>Escolhe um prato do quadro para começar.</p>
          ) : (
            <>
              <div className={styles.talaoItens}>
                {orderItems.map((item, i) => (
                  <MenuLine
                    key={i}
                    name={item.prato.nome}
                    note={[`${Math.max(1, item.quantity ?? 1)}×`, resumoItem(item)].filter(Boolean).join(' · ')}
                    price={item.total * Math.max(1, item.quantity ?? 1)}
                    action={
                      <button className={styles.remover} onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: i })} aria-label="Remover">×</button>
                    }
                  />
                ))}
              </div>
              <div className={styles.talaoTotal}>
                <MenuLine name="Total" price={totalPedido} strong />
              </div>
              <Button fullWidth size="large" onClick={() => navigate('/order-summary')}>Finalizar pedido</Button>
            </>
          )}
        </aside>
      </div>

      <Footer />
    </div>
  )
}
