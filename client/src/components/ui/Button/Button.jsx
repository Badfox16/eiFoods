import styles from './Button.module.css'

/**
 * Botão do design system "Quadro & Papel".
 * Retangular (raio pequeno), cor sólida, sem gradiente. Pill NÃO é o padrão.
 * variant: primary (piri, CTA) | dark (quadro/panela) | outline | ghost | danger
 * size: small | medium | large
 * `as` permite renderizar como <a> mantendo o estilo.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  as,
  className = '',
  disabled,
  ...props
}) {
  const Comp = as || 'button'
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Comp className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      <span className={styles.label}>{children}</span>
      {!loading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </Comp>
  )
}

export default Button
