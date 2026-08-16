import styles from './Badge.module.css'

/**
 * Etiqueta compacta (tag). Pill é aceitável aqui por ser semântico.
 * variant: neutral | primary | accent | gold | success | warning | danger | info
 *          | solidPiri | solidBoard | solidAcafrao (etiquetas fortes)
 * size: small | medium
 */
export function Badge({ children, variant = 'neutral', size = 'medium', className = '', ...props }) {
  const classes = [styles.badge, styles[variant], styles[size], className].filter(Boolean).join(' ')
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

export default Badge
