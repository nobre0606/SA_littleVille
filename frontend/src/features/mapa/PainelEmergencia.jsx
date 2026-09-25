import { Clock, MapPin, Phone } from 'lucide-react'
import { ICONE_EMERGENCIA, ROTULO_EMERGENCIA } from './icones.js'
import { formatarTelefone } from './telefone.js'

/**
 * Contatos de um local de emergência (RF02): endereço, horário e botões que LIGAM (tel:).
 * Usado no painel do mapa e na tela Emergência.
 */
export function ContatosEmergencia({ local }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-start gap-2 text-16 text-ink-1">
        <MapPin size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2" />
        {local.endereco}
      </p>
      <p className="flex items-start gap-2 text-16 text-ink-1">
        <Clock size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2" />
        {local.horario}
      </p>
      <ul className="flex flex-wrap gap-3">
        {local.telefones.map((t) => (
          <li key={t.numero}>
            {/* tel: abre o discador no celular. Rótulo acessível diz para quem liga. */}
            <a
              href={`tel:${t.numero}`}
              aria-label={`Ligar para ${t.rotulo}: ${formatarTelefone(t.numero)}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-danger px-4 text-16 font-semibold text-ink-on-primary hover:brightness-90"
            >
              <Phone size={20} strokeWidth={1.75} aria-hidden="true" />
              {t.rotulo} · {formatarTelefone(t.numero)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Selo com o ícone do tipo (mesma máscara do pino do mapa, para a pessoa associar). */
export function TipoEmergencia({ tipo }) {
  return (
    <span className="inline-flex items-center gap-2 text-14 font-semibold text-ink-2">
      <span
        aria-hidden="true"
        className="lv-mask size-5 bg-danger"
        style={{ WebkitMaskImage: `url("${ICONE_EMERGENCIA[tipo]}")`, maskImage: `url("${ICONE_EMERGENCIA[tipo]}")` }}
      />
      {ROTULO_EMERGENCIA[tipo]}
    </span>
  )
}
