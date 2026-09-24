/** Junta classes ignorando valores falsos: cx('a', cond && 'b') → 'a b'. */
export const cx = (...classes) => classes.filter(Boolean).join(' ')
