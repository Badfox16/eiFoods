import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, MenuLine, Spinner } from '../../components/ui'
import { menuApi } from '../../api'
import styles from './Home.module.css'

const PASSOS = [
  { n: '01', titulo: 'Escolhe', texto: 'Vê o menu de hoje e escolhe o prato. Ajustas molho, sal e extras.' },
  { n: '02', titulo: 'Pagas', texto: 'M-Pesa, e-Mola ou plano pré-pago. Envias o comprovativo e confirmamos.' },
  { n: '03', titulo: 'Recebes', texto: 'Entregamos no teu local de trabalho, na Beira. Encomendas até às 11h.' },
]

function dataDeHoje() {
  const t = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function Home() {
  const navigate = useNavigate()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    menuApi.getHoje()
      .then((menu) => {
        if (!active) return
        const lista = (Array.isArray(menu?.itens) ? menu.itens : [])
          .map((i) => (typeof i.pratoId === 'object' && i.pratoId
            ? { ...i.pratoId, destaque: Boolean(i.destaque), exclusivo: Boolean(i.exclusivo) }
            : null))
          .filter(Boolean)
        setItens(lista)
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const listaMenu = itens.slice(0, 6)

  // ── Slider do hero: destaque primeiro, depois até 4 pratos com foto ──
  const slides = useMemo(() => {
    const comFoto = itens.filter((p) => p.imagem?.url)
    const destaque = comFoto.find((p) => p.destaque)
    const resto = comFoto.filter((p) => p !== destaque)
    return [destaque, ...resto].filter(Boolean).slice(0, 5)
  }, [itens])

  const [slideIndex, setSlideIndex] = useState(0)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (slides.length < 2 || pausado) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => setSlideIndex((i) => (i + 1) % slides.length), 4500)
    return () => clearInterval(id)
  }, [slides.length, pausado])

  const slideAtual = slides.length ? slides[slideIndex % slides.length] : null

  return (
    <div className={styles.page}>
      <Navbar showCta />

      <main>
        {/* ── Hero: O quadro de hoje ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <span className={styles.kicker}>O quadro de hoje · {dataDeHoje()}</span>
              <h1 className={styles.headline}>Marmita fresca,<br />entregue no escritório.</h1>
              <p className={styles.sub}>
                Para quem trabalha e não dá para ir a casa almoçar: escolhe do menu de
                hoje, pagas como preferires e recebes no escritório. Até às 11h, na Beira.
              </p>
              <div className={styles.heroBtns}>
                <Button variant="primary" size="large" onClick={() => navigate('/menu')}>
                  Ver menu de hoje
                </Button>
                <Button
                  variant="ghost"
                  size="large"
                  className={styles.heroGhost}
                  onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Como funciona
                </Button>
              </div>
            </div>

            {slideAtual && (
              <figure
                className={styles.heroDish}
                onMouseEnter={() => setPausado(true)}
                onMouseLeave={() => setPausado(false)}
              >
                <div className={styles.heroDishImgStack}>
                  {slides.map((p, i) => (
                    <img
                      key={p._id}
                      src={p.imagem.url}
                      alt={p.nome}
                      className={`${styles.heroDishImg} ${i === slideIndex % slides.length ? styles.heroDishImgActive : ''}`}
                      loading={i === 0 ? undefined : 'lazy'}
                    />
                  ))}
                </div>
                <figcaption key={slideIndex} className={styles.heroDishCap}>
                  {slideAtual.destaque && <span className={styles.heroDishTag}>Prato do dia</span>}
                  <span className={styles.heroDishName}>{slideAtual.nome}</span>
                  <span className={styles.heroDishPrice}>{slideAtual.preco}<span>MT</span></span>
                </figcaption>
                {slides.length > 1 && (
                  <div className={styles.heroDots}>
                    {slides.map((p, i) => (
                      <button
                        key={p._id}
                        className={`${styles.heroDot} ${i === slideIndex % slides.length ? styles.heroDotActive : ''}`}
                        onClick={() => setSlideIndex(i)}
                        aria-label={`Ver ${p.nome}`}
                      />
                    ))}
                  </div>
                )}
              </figure>
            )}
          </div>
        </section>

        {/* ── Menu de hoje (assinatura: lista de quadro) ── */}
        <section className={styles.menuHoje}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Menu de hoje</h2>
            <button className={styles.verTudo} onClick={() => navigate('/menu')}>Ver tudo</button>
          </div>

          {loading ? (
            <div className={styles.estado}><Spinner /></div>
          ) : listaMenu.length === 0 ? (
            <div className={styles.estado}>
              <p className={styles.estadoTexto}>O menu de hoje ainda não foi publicado.</p>
              <p className={styles.estadoSub}>Volta mais logo ou vê os próximos dias no menu.</p>
            </div>
          ) : (
            <div className={styles.board}>
              {listaMenu.map((p) => (
                <MenuLine
                  key={p._id}
                  thumb={p.imagem?.url}
                  thumbBadge={p.destaque ? 'Hoje' : undefined}
                  name={p.nome}
                  note={p.descricao}
                  price={p.preco}
                  locked={p.exclusivo}
                  action={p.exclusivo ? <span className={styles.exclusivoTag}>Exclusivo</span> : undefined}
                  onClick={() => navigate('/menu')}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Como funciona ── */}
        <section id="como-funciona" className={styles.como}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <div className={styles.passos}>
            {PASSOS.map((p) => (
              <div key={p.n} className={styles.passo}>
                <span className={styles.passoN}>{p.n}</span>
                <h3 className={styles.passoTitulo}>{p.titulo}</h3>
                <p className={styles.passoTexto}>{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Planos + Sequência ── */}
        <section className={styles.tiras}>
          <button className={`${styles.tira} ${styles.tiraBoard}`} onClick={() => navigate('/planos')}>
            <span className={styles.tiraKicker}>Planos pré-pagos</span>
            <span className={styles.tiraTitulo}>Compra almoços à frente e poupa.</span>
            <span className={styles.tiraLink}>Ver tabela de planos →</span>
          </button>
          <button className={`${styles.tira} ${styles.tiraPaper}`} onClick={() => navigate('/streak')}>
            <span className={styles.tiraKicker}>Sequência</span>
            <span className={styles.tiraTitulo}>Junta um selo a cada dia útil.</span>
            <span className={styles.tiraLink}>Ver o meu cartão →</span>
          </button>
        </section>
      </main>

      <Footer />
    </div>
  )
}
