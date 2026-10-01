import { useNavigate } from 'react-router-dom'
import styles from './Footer.module.css'

const WHATSAPP = '258841234567'
const ANO = new Date().getFullYear()

const NAV_LINKS = [
  { label: 'Início', path: '/' },
  { label: 'Menu', path: '/menu' },
  { label: 'Planos', path: '/planos' },
  { label: 'Sorteio', path: '/sorteio' },
]

const METODOS = ['M-Pesa', 'eMola', 'Transferência']

export default function Footer() {
  const navigate = useNavigate()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* ── Brand ── */}
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <img src="/logo.jpg" alt="Marmita Fresca" className={styles.logoImg} />
          </div>
          <p className={styles.tagline}>Marmita fresca, entregue no escritório.</p>
          <p className={styles.descricao}>
            Comida preparada no dia e entregue no seu local de trabalho, na Beira.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className={styles.whatsappLink}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            +258 84 123 4567
          </a>
        </div>

        {/* ── Navegação ── */}
        <div className={styles.coluna}>
          <h4 className={styles.colunaTitulo}>Navegação</h4>
          <nav className={styles.navLinks}>
            {NAV_LINKS.map(link => (
              <button key={link.path} className={styles.navLink} onClick={() => navigate(link.path)}>
                {link.label}
              </button>
            ))}
          </nav>

          <h4 className={styles.colunaTitulo} style={{ marginTop: 32 }}>Horário</h4>
          <div className={styles.horario}>
            <span className={styles.horarioLinha}>
              <span>Encomendas</span>
              <span className={styles.horarioVal}>até às 11h</span>
            </span>
            <span className={styles.horarioLinha}>
              <span>Entregas</span>
              <span className={styles.horarioVal}>12h – 13h</span>
            </span>
            <span className={styles.horarioLinha}>
              <span>Dias úteis</span>
              <span className={styles.horarioVal}>Seg – Sex</span>
            </span>
          </div>
        </div>

        {/* ── Pagamentos + Localização ── */}
        <div className={styles.coluna}>
          <h4 className={styles.colunaTitulo}>Pagamento</h4>
          <div className={styles.metodos}>
            {METODOS.map(m => (
              <span key={m} className={styles.metodoBadge}>{m}</span>
            ))}
          </div>

          <h4 className={styles.colunaTitulo} style={{ marginTop: 32 }}>Localização</h4>
          <div className={styles.localizacao}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Beira, Moçambique</span>
          </div>

          <h4 className={styles.colunaTitulo} style={{ marginTop: 32 }}>Contacto</h4>
          <div className={styles.contacto}>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className={styles.contactoLink}>
              WhatsApp
            </a>
            <a href="mailto:info@eifoods.co.mz" className={styles.contactoLink}>
              info@eifoods.co.mz
            </a>
          </div>
        </div>

      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottom}>
        <p className={styles.copy}>© {ANO} Marmita Fresca · Todos os direitos reservados</p>
        <div className={styles.legal}>
          <span>Termos de uso</span>
          <span className={styles.legalDot}>·</span>
          <span>Política de privacidade</span>
        </div>
      </div>
    </footer>
  )
}
