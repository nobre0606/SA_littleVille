import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { MolduraCampo } from './Campo.jsx'
import { classesControle } from './classesControle.js'
import { cx } from './cx.js'

/**
 * Select NATIVO estilizado. Nativo de propósito: no celular abre o seletor do sistema, com
 * teclado e leitor de tela funcionando sem código extra.
 * `opcoes`: [{ valor, rotulo }] · `vazio`: texto da opção inicial (ex.: "Escolha o bairro").
 */
export function Select({ rotulo, dica, erro, obrigatorio, opcoes, vazio, className, id: idProp, ...props }) {
  const idGerado = useId()
  const id = idProp ?? idGerado
  const descritoPor = [dica && `${id}-dica`, erro && `${id}-erro`].filter(Boolean).join(' ') || undefined
  return (
    <MolduraCampo id={id} rotulo={rotulo} dica={dica} erro={erro} obrigatorio={obrigatorio} className={className}>
      <div className="relative">
        <select
          id={id}
          className={cx(classesControle, 'appearance-none pr-12')}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritoPor}
          required={obrigatorio}
          {...props}
        >
          {vazio !== undefined && <option value="">{vazio}</option>}
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          size={20}
          strokeWidth={1.75}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-2"
        />
      </div>
    </MolduraCampo>
  )
}
