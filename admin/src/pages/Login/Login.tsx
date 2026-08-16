import { useState } from 'react'
import { Button } from '../../components'
import { useAdminAuth } from '../../context/useAdminAuth'
import { ApiError } from '../../lib/api'
import styles from './Login.module.css'

/**
 * Ecrã de autenticação do painel admin. Mostrado enquanto não há sessão válida.
 */
export function Login() {
  const { login } = useAdminAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aSubmeter, setASubmeter] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setASubmeter(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401
        ? 'Credenciais inválidas'
        : (err as Error).message || 'Não foi possível entrar'
      setErro(msg)
    } finally {
      setASubmeter(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>eiFoods · Admin</h1>
        <p className={styles.subtitle}>Inicie sessão para gerir o painel</p>

        <label className={styles.field}>
          <span>Utilizador</span>
          <input
            className={styles.input}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {erro && <p className={styles.erro} role="alert">{erro}</p>}

        <Button type="submit" fullWidth disabled={aSubmeter}>
          {aSubmeter ? 'A entrar…' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
