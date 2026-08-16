import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar/Navbar'
import Footer from '../../components/Footer/Footer'
import { Button, Input, Spinner, MenuLine } from '../../components/ui'
import { sorteioApi } from '../../api'
import { CONFIG } from '../../data/menuData'
import styles from './Sorteio.module.css'

const PRATO_FALLBACK = { nome: 'Prato do dia', valor: 290 }

function isFridayInMaputo() {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Maputo',
    weekday: 'short',
  }).format(new Date()).toLowerCase()
  return weekday === 'fri'
}

export default function Sorteio() {
  const navigate = useNavigate()
  const [valorRifa, setValorRifa] = useState(10)
  const [participantes, setParticipantes] = useState([])
  const [vencedorAtual, setVencedorAtual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inscricao, setInscricao] = useState({ nome: '', empresa: '', contacto: '' })
  const [inscrevendo, setInscrevendo] = useState(false)
  const [inscricaoMsg, setInscricaoMsg] = useState(null)
  const bloqueioSexta = isFridayInMaputo()

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const data = await sorteioApi.get()
        if (!active) return
        setValorRifa(Number.isFinite(data.valorRifa) ? data.valorRifa : 10)
        setParticipantes(data.participantes ?? [])
        setVencedorAtual(data.vencedorAtual ?? null)
      } catch (e) {
        if (active) setError(e.message)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const vencedor = useMemo(
    () => participantes.find((p) => p.id === vencedorAtual?.participanteId) ?? null,
    [participantes, vencedorAtual]
  )

  const dataPublicacao = vencedorAtual?.data
    ? new Date(vencedorAtual.data).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })
    : null

  const premioValor = vencedorAtual?.premioValor ?? PRATO_FALLBACK.valor
  const premioNome = vencedorAtual?.pratoNome ?? PRATO_FALLBACK.nome

  const whatsappTexto = encodeURIComponent(
    `Ola Marmita Fresca. Quero participar no sorteio. Ja fiz o pagamento de ${valorRifa} MT e envio o comprovativo.`
  )
  const whatsappUrl = `https://wa.me/${CONFIG.whatsappNumero}?text=${whatsappTexto}`

  async function submeterInscricao(e) {
    e.preventDefault()
    if (bloqueioSexta) {
      setInscricaoMsg('As inscrições ficam indisponíveis à sexta-feira. Volta a tentar de sábado a quinta.')
      return
    }
    if (!inscricao.nome.trim() || !inscricao.contacto.trim()) {
      setInscricaoMsg('Preenche nome e contacto para te inscreveres.')
      return
    }
    setInscrevendo(true)
    setInscricaoMsg(null)
    try {
      await sorteioApi.inscrever(inscricao)
      setInscricao({ nome: '', empresa: '', contacto: '' })
      setInscricaoMsg('Inscrição enviada. Envia agora o comprovativo no WhatsApp e aguarda confirmação.')
    } catch (err) {
      setInscricaoMsg(err.message)
    } finally {
      setInscrevendo(false)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero quadro ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.kicker}>Sorteio semanal</span>
          <h1 className={styles.heroTitle}>O sorteio da semana</h1>
          <p className={styles.heroSub}>
            Participa com uma rifa e concorre ao prato da semana. O sorteio é feito
            pela equipa; aqui acompanhas o prémio, o resultado e os inscritos.
          </p>
        </div>
      </section>

      {loading ? (
        <div className={styles.stateBox}><Spinner size="large" /></div>
      ) : (
        <div className={styles.container}>
          <div className={styles.grid}>
            {/* ── Coluna principal ── */}
            <div className={styles.main}>
              {/* Prémio */}
              <div className={styles.premio}>
                <span className={styles.premioLabel}>Prémio desta semana</span>
                <span className={styles.premioNome}>{premioNome}</span>
                <span className={styles.premioValor}>{premioValor}<span>MT</span></span>
              </div>

              {/* Resultado */}
              <div className={styles.resultado}>
                <span className={styles.resultadoLabel}>Resultado</span>
                {vencedor ? (
                  <div className={styles.vencedor}>
                    <span className={styles.vencedorRef}>{vencedor.ref}</span>
                    <span className={styles.vencedorNome}>{vencedor.nome}</span>
                    {vencedor.empresa && <span className={styles.vencedorMeta}>{vencedor.empresa}</span>}
                    <span className={styles.vencedorTag}>Vencedor</span>
                  </div>
                ) : (
                  <p className={styles.resultadoVazio}>Ainda não foi publicado o resultado desta semana.</p>
                )}
                <p className={styles.resultadoData}>
                  {dataPublicacao ? `Publicado em ${dataPublicacao}` : 'A aguardar publicação da equipa.'}
                </p>
                {error && <p className={styles.resultadoData}>Erro ao carregar: {error}</p>}
              </div>

              {/* Participantes (talão) */}
              <div className={styles.participantes}>
                <div className={styles.participantesHead}>
                  <h2 className={styles.sectionTitle}>Participantes</h2>
                  <span className={styles.contagem}>{participantes.length} inscritos</span>
                </div>
                {participantes.length === 0 ? (
                  <p className={styles.vazio}>Ainda não há inscritos esta semana.</p>
                ) : (
                  <div className={styles.lista}>
                    {participantes.map((p) => (
                      <MenuLine
                        key={p.id}
                        lead={p.ref}
                        name={p.nome}
                        note={p.empresa || undefined}
                        action={vencedor?.id === p.id ? <span className={styles.tag}>Vencedor</span> : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Coluna participar ── */}
            <aside className={styles.aside}>
              <h2 className={styles.sectionTitle}>Como participar</h2>
              <ol className={styles.passos}>
                <li><span className={styles.passoN}>1</span> Paga a rifa de <strong>{valorRifa} MT</strong>.</li>
                <li><span className={styles.passoN}>2</span> Envia o comprovativo no WhatsApp.</li>
                <li><span className={styles.passoN}>3</span> A equipa confirma e entras na lista.</li>
              </ol>

              <Button as="a" href={whatsappUrl} target="_blank" rel="noreferrer" variant="dark" fullWidth>
                Enviar comprovativo no WhatsApp
              </Button>

              <form className={styles.form} onSubmit={submeterInscricao}>
                <h3 className={styles.formTitulo}>Inscrever no sorteio</h3>
                <Input
                  label="Nome"
                  placeholder="Nome completo"
                  value={inscricao.nome}
                  onChange={(e) => setInscricao((prev) => ({ ...prev, nome: e.target.value }))}
                />
                <Input
                  label="Local de trabalho (opcional)"
                  placeholder="Ex.: nome do escritório"
                  value={inscricao.empresa}
                  onChange={(e) => setInscricao((prev) => ({ ...prev, empresa: e.target.value }))}
                />
                <Input
                  label="Contacto"
                  type="tel"
                  inputMode="numeric"
                  placeholder="Número de telefone"
                  value={inscricao.contacto}
                  onChange={(e) => setInscricao((prev) => ({ ...prev, contacto: e.target.value }))}
                />
                <Button type="submit" fullWidth loading={inscrevendo} disabled={bloqueioSexta}>
                  {bloqueioSexta ? 'Inscrições fechadas hoje' : 'Enviar inscrição'}
                </Button>
                {bloqueioSexta && <p className={styles.aviso}>À sexta-feira as inscrições estão fechadas.</p>}
                {inscricaoMsg && <p className={styles.msg}>{inscricaoMsg}</p>}
              </form>

              <button className={styles.verMenu} onClick={() => navigate('/menu')}>Ver menu de hoje →</button>
            </aside>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
