import styles from './Card.module.css'

/**
 * Painel do sistema "Quadro & Papel".
 * variant: paper (folha clara, filete) | board (quadro/panela escuro) |
 *          sunken (papel recuado) | outline (só filete)
 * interactive: hover para painéis clicáveis (sem sombra flutuante).
 * accent: 'piri' | 'matapa' | 'acafrao' desenha um filete sólido à esquerda.
 */
export function Card({
  children,
  variant = 'paper',
  interactive = false,
  accent,
  as,
  className = '',
  ...props
}) {
  const Comp = as || 'div'
  const classes = [
    styles.card,
    styles[variant],
    interactive ? styles.interactive : '',
    accent ? styles[`accent_${accent}`] : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Comp className={classes} {...props}>
      {children}
    </Comp>
  )
}

export default Card
