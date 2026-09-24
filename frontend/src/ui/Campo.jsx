import { useId } from 'react'
import { CircleAlert } from 'lucide-react'
import { classesControle } from './classesControle.js'
import { cx } from './cx.js'

/** Rótulo, dica, erro e contador — compartilhado por Campo e Select para ficarem idênticos. */
export function MolduraCampo({ id, rotulo, dica, erro, obrigatorio, contador, children, className }) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-14 font-semibold text-ink-1">
        {rotulo}
        {obrigatorio && (
          <>
            <span className="text-danger-text" aria-hidden="true">
              {' *'}
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {(dica || erro || contador) && (
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            {dica && (
              <p id={`${id}-dica`} className="text-14 text-ink-2">
                {dica}
              </p>
            )}
            {erro && (
              <p id={`${id}-erro`} className="flex items-center gap-1 text-14 font-semibold text-danger-text">
                <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                {erro}
              </p>
            )}
          </div>
          {contador}
        </div>
      )}
    </div>
  )
}

/**
 * Campo de texto (ou área de texto com `multilinha`). O rótulo é sempre visível: placeholder
 * nunca substitui rótulo. O erro fica ligado ao campo por aria-describedby + aria-invalid.
 * Com `maxLength` numa área de texto, mostra o contador "123/500".
 */
export function Campo({ rotulo, dica, erro, obrigatorio, multilinha = false, icone: Icone, className, id: idProp, ...props }) {
  const idGerado = useId()
  const id = idProp ?? idGerado
  const temContador = multilinha && props.maxLength
  const descritoPor = [dica && `${id}-dica`, erro && `${id}-erro`, temContador && `${id}-contador`].filter(Boolean).join(' ') || undefined
  const tamanho = String(props.value ?? '').length
  const perto = temContador && tamanho >= props.maxLength * 0.9

  const contador = temContador ? (
    <p id={`${id}-contador`} className={cx('shrink-0 text-14 tabular-nums', perto ? 'font-bold text-ink-1' : 'text-ink-2')}>
      {tamanho}/{props.maxLength}
      <span className="sr-only"> caracteres</span>
    </p>
  ) : null

  const comuns = {
    id,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descritoPor,
    required: obrigatorio,
    ...props,
  }

  return (
    <MolduraCampo id={id} rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio} contador={contador} className={className}>
      {multilinha ? (
        <textarea rows={4} className={cx(classesControle, 'resize-y')} {...comuns} />
      ) : (
        <div className="relative">
          {Icone && (
            <Icone
              size={20}
              strokeWidth={1.75}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2"
            />
          )}
          <input className={cx(classesControle, Icone && 'pl-12')} {...comuns} />
        </div>
      )}
    </MolduraCampo>
  )
}
