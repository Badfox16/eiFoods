import styles from './MenuLine.module.css'

/**
 * Linha de quadro/talão — o ELEMENTO DE ASSINATURA do produto.
 *
 *   Nome do prato · · · · · · · · · 250 MT
 *
 * Reutilizada no menu, carrinho, tabela de planos, prémios da sequência e
 * talão de confirmação. Nome em Fraunces, preço em mono, ligados por pontilhado.
 *
 * Props:
 *  - name        (obrigatório) título da linha
 *  - note        meta secundária por baixo do nome
 *  - price       valor à direita (renderizado em mono)
 *  - unit        sufixo do valor (ex.: "MT"); default "MT"
 *  - lead        elemento à esquerda (nº, miniatura, marca) — ignorado se `thumb` for dado
 *  - thumb       URL de uma foto do prato; mostra uma miniatura à esquerda
 *  - thumbBadge  selo pequeno sobre o canto da miniatura (ex.: "Hoje")
 *  - onClick     torna a linha acionável (button)
 *  - locked      estado bloqueado (ex.: prato exclusivo) — esbate a miniatura
 *  - strong      linha de total (destaque piri)
 *  - action      elemento à direita em vez do preço
 */
export function MenuLine({
  name,
  note,
  price,
  unit = 'MT',
  lead,
  thumb,
  thumbBadge,
  onClick,
  locked = false,
  strong = false,
  action,
  className = '',
  ...props
}) {
  const Comp = onClick ? 'button' : 'div'
  const classes = [
    styles.line,
    onClick ? styles.clickable : '',
    locked ? styles.locked : '',
    strong ? styles.strong : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <Comp className={classes} onClick={onClick} type={onClick ? 'button' : undefined} {...props}>
      {thumb ? (
        <span className={styles.thumbWrap}>
          <img src={thumb} alt="" className={styles.thumb} loading="lazy" />
          {thumbBadge != null && <span className={styles.thumbBadge}>{thumbBadge}</span>}
        </span>
      ) : (
        lead != null && <span className={styles.lead}>{lead}</span>
      )}
      <span className={styles.body}>
        <span className={styles.name}>{name}</span>
        {note && <span className={styles.note}>{note}</span>}
      </span>
      <span className={styles.leader} aria-hidden="true" />
      {action != null ? (
        <span className={styles.action}>{action}</span>
      ) : price != null ? (
        <span className={styles.price}>
          {price}<span className={styles.unit}>{unit}</span>
        </span>
      ) : null}
    </Comp>
  )
}

export default MenuLine
