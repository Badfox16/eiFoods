import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrder } from '../../context/useOrder'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { pratosApi, scheduleApi } from '../../api'
import styles from './Menu.module.css'

const DIAS = ['Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado']

function PratosSlideshow({ pratos, pratoDoDia, onSelecionar }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [animDir, setAnimDir] = useState('next')
  const timerRef = useRef(null)

  const total = pratos.length

  const goTo = useCallback((index, dir = 'next') => {
    setAnimDir(dir)
    setCurrent((index + total) % total)
  }, [total])

  const next = useCallback(() => goTo(current + 1, 'next'), [current, goTo])
  const prev = useCallback(() => goTo(current - 1, 'prev'), [current, goTo])

  useEffect(() => {
    if (paused || total < 2) return
    timerRef.current = setInterval(next, 4500)
    return () => clearInterval(timerRef.current)
  }, [paused, next, total])

  if (total === 0) return null

  const prato = pratos[current]
  const isHoje = pratoDoDia?._id === prato._id
  const imgUrl = prato.imagem?.url ?? prato.imagem

  return (
    <section
      className={styles.slideshow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={`${styles.slide} ${styles[`slide${animDir}`]}`} key={prato._id}>
        {imgUrl && (
          <img src={imgUrl} alt={prato.nome} className={styles.slideImg} />
        )}
        <div className={styles.slideOverlay} />
        <div className={styles.slideContent}>
          <div className={styles.slideBadges}>
            {isHoje && <span className={styles.slideBadgeHoje}>⭐ Prato do Dia</span>}
            <span className={styles.slideBadgePreco}>{prato.preco} MZN</span>
          </div>
          <h2 className={styles.slideNome}>{prato.nome}</h2>
          {prato.descricao && (
            <p className={styles.slideDescricao}>{prato.descricao}</p>
          )}
          <button
            className={styles.slideBtnSelecionar}
            onClick={() => onSelecionar(prato)}
          >
            Selecionar prato
          </button>
        </div>
      </div>

      {total > 1 && (
        <>
          <button className={`${styles.slideArrow} ${styles.slideArrowPrev}`} onClick={prev} aria-label="Anterior">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button className={`${styles.slideArrow} ${styles.slideArrowNext}`} onClick={next} aria-label="Próximo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <div className={styles.slideDots}>
            {pratos.map((_, i) => (
              <button
                key={i}
                className={`${styles.slideDot} ${i === current ? styles.slideDotActive : ''}`}
                onClick={() => goTo(i, i > current ? 'next' : 'prev')}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <div className={styles.slideProgress}>
            <div
              className={styles.slideProgressBar}
              style={{ animationPlayState: paused ? 'paused' : 'running' }}
              key={current}
            />
          </div>
        </>
      )}
    </section>
  )
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skeleton} ${styles.skeletonImg}`} />
      <div className={styles.skeletonTexto}>
        <div className={`${styles.skeleton} ${styles.skeletonNome}`} />
        <div className={`${styles.skeleton} ${styles.skeletonDesc}`} />
        <div className={`${styles.skeleton} ${styles.skeletonDesc} ${styles.skeletonDescCurto}`} />
        <div className={`${styles.skeleton} ${styles.skeletonPreco}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.skeletonBtn}`} />
    </div>
  )
}

export default function Menu() {
  const navigate = useNavigate()
  const { state, dispatch } = useOrder()
  const { orderItems, selectedEmpresa } = state
  const [pratos, setPratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [pratoDoDia, setPratoDoDia] = useState(null)
  const [metaExpandida, setMetaExpandida] = useState({})

  const diaAtual = DIAS[new Date().getDay()]

  useEffect(() => {
    let active = true

    Promise.all([
      pratosApi.list({ disponivel: true }),
      scheduleApi.getHoje().catch(() => ({ prato: null })),
    ])
      .then(([listaPratos, hoje]) => {
        if (!active) return
        setPratoDoDia(hoje?.prato ?? null)

        // empresa em standby — selectedEmpresa fica sempre null no fluxo atual
        // (sem passo de código de empresa), por isso pratosBase = listaPratos.
        // Lógica de filtro mantida para reativação futura.
        const companyPratoIds = selectedEmpresa?.menu?.pratoIds
          ? selectedEmpresa.menu.pratoIds.map((p) => (typeof p === 'string' ? p : p._id))
          : null

        const pratosBase = companyPratoIds
          ? listaPratos.filter((p) => companyPratoIds.includes(p._id))
          : listaPratos

        const hojeId = hoje?.prato?._id
        if (!hojeId) {
          setPratos(pratosBase)
          return
        }

        const ordenados = [...pratosBase].sort((a, b) => {
          if (a._id === hojeId) return -1
          if (b._id === hojeId) return 1
          return 0
        })

        setPratos(ordenados)
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [selectedEmpresa])

  const pratosFiltrados = pratos.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(busca.toLowerCase())
  )

  function handleSelecionar(prato) {
    dispatch({ type: 'SELECT_DISH', payload: prato })
    navigate('/customize')
  }

  function handleRemoverItem(index) {
    dispatch({ type: 'REMOVE_ITEM', payload: index })
  }

  const totalItensPedido = orderItems.reduce((acc, item) => acc + Math.max(1, item.quantity ?? 1), 0)
  const totalPedido = orderItems.reduce((acc, item) => acc + (item.total * Math.max(1, item.quantity ?? 1)), 0)

  return (
    <div className={styles.page}>
      <Navbar />

      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.heroBadge}>Menu · {diaAtual}</span>
          <h1 className={styles.heroTitle}>Escolha o seu prato</h1>
          <p className={styles.heroSub}>Personalize ao seu gosto e receba no escritório</p>
        </div>
        <div className={styles.heroDecor} />
      </section>

      {/* Slideshow + Search agrupados */}
      <div className={`${styles.slideshowOuter} ${!loading && !error && pratos.length > 0 ? styles.slideshowOuterActive : ''}`}>
        {!loading && !error && pratos.length > 0 && (
          <PratosSlideshow
            pratos={pratos}
            pratoDoDia={pratoDoDia}
            onSelecionar={handleSelecionar}
          />
        )}

        {/* Barra de pesquisa */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Pesquisar pratos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button className={styles.searchClear} onClick={() => setBusca('')} aria-label="Limpar">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {pratoDoDia && (
        <div className={styles.todayBanner}>
          <div className={styles.todayBannerInner}>
            <div className={styles.todayBannerIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div className={styles.todayBannerTexto}>
              <span className={styles.todayBannerLabel}>Prato do Dia</span>
              <span className={styles.todayBannerNome}>{pratoDoDia.nome}</span>
            </div>
            <span className={styles.todayBannerPreco}>{pratoDoDia.preco} MZN</span>
          </div>
        </div>
      )}

      {selectedEmpresa && (
        <div className={styles.todayBar}>
          <div className={styles.todayBarInner}>
            <span className={styles.todayBadge}>Empresa</span>
            <p className={styles.todayText}>{selectedEmpresa.empresaNome}</p>
          </div>
        </div>
      )}

      {/* Container 2 colunas */}
      <div className={styles.container}>

        {/* ── Coluna Esquerda: Lista ── */}
        <main className={styles.main}>

          {/* ── Prato do Dia — secção destacada ── */}
          {!loading && !error && pratoDoDia && (
            <div className={styles.pratoDoDiaCard}>
              <div className={styles.pratoDoDiaImagemWrap}>
                <img
                  src={pratoDoDia.imagem?.url ?? pratoDoDia.imagem}
                  alt={pratoDoDia.nome}
                  className={styles.pratoDoDiaImagem}
                />
                <div className={styles.pratoDoDiaOverlay} />
              </div>
              <div className={styles.pratoDoDiaConteudo}>
                <span className={styles.pratoDoDiaBadge}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Prato do Dia
                </span>
                <h2 className={styles.pratoDoDiaNome}>{pratoDoDia.nome}</h2>
                {pratoDoDia.descricao && (
                  <p className={styles.pratoDoDiaDescricao}>{pratoDoDia.descricao}</p>
                )}
                <div className={styles.pratoDoDiaRodape}>
                  <span className={styles.pratoDoDiaPreco}>{pratoDoDia.preco} MZN</span>
                  <button
                    className={styles.pratoDoDiaBtn}
                    onClick={() => handleSelecionar(pratoDoDia)}
                  >
                    Selecionar prato
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className={styles.lista}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {error && (
            <div className={styles.estadoVazio}>
              <span className={styles.estadoIcon}>⚠️</span>
              <p className={styles.estadoTexto}>Erro ao carregar o menu</p>
              <p className={styles.estadoSub}>{error}</p>
            </div>
          )}

          {!loading && !error && pratosFiltrados.length === 0 && (
            <div className={styles.estadoVazio}>
              <span className={styles.estadoIcon}>{busca ? '🔍' : '🍽️'}</span>
              <p className={styles.estadoTexto}>
                {busca ? `Sem resultados para "${busca}"` : 'Sem pratos disponíveis hoje'}
              </p>
              <p className={styles.estadoSub}>
                {busca ? 'Tente outra pesquisa' : 'Volte amanhã para ver o novo menu'}
              </p>
            </div>
          )}

          {!loading && !error && pratosFiltrados.length > 0 && (
            <div className={styles.lista}>
              {pratosFiltrados.map((prato) => {
                const isHoje = pratoDoDia?._id === prato._id
                return (
                  <div key={prato._id} className={`${styles.card} ${isHoje ? styles.cardDestaque : ''}`}>
                    {isHoje && (
                      <span className={styles.cardTodayBadge}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        Prato do Dia
                      </span>
                    )}
                    <div className={styles.cardImagemWrap}>
                      <img
                        src={prato.imagem?.url ?? prato.imagem}
                        alt={prato.nome}
                        className={styles.cardImagem}
                      />
                    </div>
                    <div className={styles.cardTexto}>
                      {isHoje && <span className={styles.cardDestaqueLabel}>Recomendado hoje</span>}
                      <p className={styles.cardNome}>{prato.nome}</p>
                      <p className={styles.cardDescricao}>{prato.descricao}</p>
                      <span className={styles.cardPreco}>{prato.preco} MZN</span>
                    </div>
                    <button
                      className={`${styles.btnSelecionar} ${isHoje ? styles.btnSelecionarDestaque : ''}`}
                      onClick={() => handleSelecionar(prato)}
                    >
                      Selecionar
                    </button>
                  </div>
                )
              })}
            </div>
          )}

        </main>

        {/* ── Coluna Direita: Carrinho ── */}
        <aside className={styles.cartPanel}>
          <div className={styles.cartHeader}>
            <div className={styles.cartTituloWrap}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <h3 className={styles.cartTitulo}>Meu Pedido</h3>
            </div>
            {orderItems.length > 0 && (
              <span className={styles.cartBadge}>{totalItensPedido}</span>
            )}
          </div>

          {orderItems.length === 0 ? (
            <div className={styles.cartVazio}>
              <span className={styles.cartVazioIcon}>🛒</span>
              <p className={styles.cartVazioTexto}>O seu carrinho está vazio</p>
              <p className={styles.cartVazioSub}>Selecione um prato para começar</p>
            </div>
          ) : (
            <>
              <ul className={styles.cartItens}>
                {orderItems.map((item, i) => {
                  const paidNames = Array.isArray(item.customizations?.paid)
                    ? item.customizations.paid.map((e) => e.nome)
                    : item.customizations?.paid?.nome ? [item.customizations.paid.nome] : []
                  const metaLinhas = [
                    `Qtd: ${Math.max(1, item.quantity ?? 1)}x`,
                    item.customizations?.free?.length > 0 ? `Gratis: ${item.customizations.free.join(', ')}` : null,
                    `Sal: ${item.customizations?.salt ?? 'Normal'}`,
                    paidNames.length > 0 ? `Extras: ${paidNames.join(', ')}` : null,
                  ].filter(Boolean)
                  const precisaToggle = metaLinhas.length > 2 || metaLinhas.some((linha) => linha.length > 38)
                  const mostrarTudo = Boolean(metaExpandida[i])
                  const metaVisiveis = mostrarTudo ? metaLinhas : metaLinhas.slice(0, 2)

                  return (
                    <li key={i} className={styles.cartItem}>
                      <div className={styles.cartItemImgWrap}>
                        {item.prato.imagem?.url
                          ? <img src={item.prato.imagem.url} alt={item.prato.nome} className={styles.cartItemImg} />
                          : <div className={styles.cartItemImgFallback}>🍽️</div>
                        }
                      </div>
                      <div className={styles.cartItemInfo}>
                        <p className={styles.cartItemNome}>{item.prato.nome}</p>
                        {metaVisiveis.map((linha) => (
                          <p key={linha} className={styles.cartItemCustom}>{linha}</p>
                        ))}
                        {precisaToggle && (
                          <button
                            type="button"
                            className={styles.cartMetaToggle}
                            onClick={() => setMetaExpandida((prev) => ({ ...prev, [i]: !prev[i] }))}
                          >
                            {mostrarTudo ? 'Ver menos' : 'Ver mais'}
                          </button>
                        )}
                      </div>
                      <div className={styles.cartItemDireita}>
                        <span className={styles.cartItemPreco}>{item.total * Math.max(1, item.quantity ?? 1)} MZN</span>
                        <button
                          className={styles.cartItemRemover}
                          onClick={() => handleRemoverItem(i)}
                          aria-label="Remover item"
                        >✕</button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className={styles.cartRodape}>
                <div className={styles.cartTotal}>
                  <span>Total</span>
                  <span className={styles.cartTotalValor}>{totalPedido} MZN</span>
                </div>
                <button
                  className={styles.btnFinalizar}
                  onClick={() => navigate('/order-summary')}
                >
                  Finalizar pedido
                </button>
              </div>
            </>
          )}
        </aside>

      </div>
      <Footer />
    </div>
  )
}
