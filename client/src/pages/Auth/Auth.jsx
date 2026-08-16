import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/ToastContext'
import Navbar from '../../components/Navbar/Navbar'
import { Button } from '../../components/ui'
import styles from './Auth.module.css'

const CODE_LENGTH = 6

const BENEFICIOS = [
  'Junte um selo a cada dia útil e ganhe prémios.',
  'Os planos premium abrem os pratos exclusivos.',
  'Os seus dados ficam guardados para pedir mais rápido.',
]

export default function Auth() {
  const navigate = useNavigate()
  const { requestOtp, verifyOtp, isAuthenticated, loading } = useAuth()
  const { showToast } = useToast()

  const [passo, setPasso] = useState('telefone') // 'telefone' | 'codigo'
  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const codigoRef = useRef(null)

  // Se já autenticado, sai da página de login.
  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/menu', { replace: true })
  }, [loading, isAuthenticated, navigate])

  useEffect(() => {
    if (passo === 'codigo') codigoRef.current?.focus()
  }, [passo])

  async function handleEnviarTelefone(e) {
    e.preventDefault()
    setErro('')
    const limpo = telefone.replace(/\D/g, '')
    if (limpo.length < 9) {
      setErro('Introduza um número de telefone válido')
      return
    }
    try {
      setEnviando(true)
      await requestOtp(telefone)
      setPasso('codigo')
      showToast('Código enviado. Verifique as suas mensagens.', 'info')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleVerificar(e) {
    e.preventDefault()
    setErro('')
    if (!/^\d{6}$/.test(codigo)) {
      setErro('O código tem 6 dígitos')
      return
    }
    try {
      setEnviando(true)
      const res = await verifyOtp(telefone, codigo)
      showToast(res.novo ? 'Conta criada. Bem-vindo!' : 'Sessão iniciada.', 'success')
      navigate('/menu', { replace: true })
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleReenviar() {
    setErro('')
    try {
      setEnviando(true)
      await requestOtp(telefone)
      showToast('Novo código enviado.', 'info')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.shell}>
          {/* ── Painel-quadro de marca ── */}
          <aside className={styles.aside}>
            <div className={styles.asideInner}>
              <div className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true" />
                <span className={styles.brandName}>Marmita Fresca</span>
              </div>
              <h2 className={styles.asideTitulo}>Marmita fresca, entregue no escritório.</h2>
              <ul className={styles.beneficios}>
                {BENEFICIOS.map((b) => (
                  <li key={b} className={styles.beneficio}>{b}</li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── Formulário ── */}
          <div className={styles.panel}>
            <div className={styles.steps} aria-hidden="true">
              <span className={`${styles.step} ${styles.stepOn}`} />
              <span className={`${styles.step} ${passo === 'codigo' ? styles.stepOn : ''}`} />
            </div>

            {passo === 'telefone' ? (
              <>
                <h1 className={styles.titulo}>Entrar ou criar conta</h1>
                <p className={styles.sub}>
                  Introduza o seu número. Enviamos um código para confirmar.
                </p>

                <form className={styles.form} onSubmit={handleEnviarTelefone}>
                  <label className={styles.label} htmlFor="telefone">Número de telefone</label>
                  <div className={`${styles.telWrap} ${erro ? styles.telWrapErro : ''}`}>
                    <span className={styles.telPrefix}>+258</span>
                    <input
                      id="telefone"
                      className={styles.telInput}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="84 123 4567"
                      value={telefone}
                      onChange={(e) => { setTelefone(e.target.value); setErro('') }}
                      autoFocus
                    />
                  </div>

                  {erro && <p className={styles.erro}>{erro}</p>}

                  <Button type="submit" size="large" fullWidth loading={enviando}>
                    Receber código
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className={styles.titulo}>Introduza o código</h1>
                <p className={styles.sub}>
                  Enviámos um código de {CODE_LENGTH} dígitos para <strong>{telefone}</strong>.
                </p>

                <form className={styles.form} onSubmit={handleVerificar}>
                  <label className={styles.label} htmlFor="codigo">Código de verificação</label>
                  <input
                    id="codigo"
                    ref={codigoRef}
                    className={styles.codeInput}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={CODE_LENGTH}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)); setErro('') }}
                  />

                  {erro && <p className={styles.erro}>{erro}</p>}

                  <Button type="submit" size="large" fullWidth loading={enviando}>
                    Confirmar
                  </Button>
                </form>

                <div className={styles.acoesSecundarias}>
                  <button type="button" className={styles.link} onClick={() => { setPasso('telefone'); setCodigo(''); setErro('') }}>
                    Alterar número
                  </button>
                  <button type="button" className={styles.link} onClick={handleReenviar} disabled={enviando}>
                    Reenviar código
                  </button>
                </div>
              </>
            )}

            <p className={styles.rodape}>
              Ao continuar, aceita receber uma mensagem com o código de verificação.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
