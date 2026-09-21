/**
 * Regra da qualidade adaptativa (histerese). Módulo puro, testado em qualityGovernor.test.js.
 *
 * O motor mede o FPS médio numa janela deslizante (~2 s) e chama `feed` a cada 0,5 s.
 * `avg` é `null` enquanto a janela não está cheia (por exemplo, logo após uma troca de nível).
 *
 *  - IGNORADO: os primeiros 2 s depois do carregamento da imagem (`sinceLoad` < 2), todo o
 *    período em que `paused` for true (a intro da Fase 3 liga isso) e janelas incompletas.
 *    Enquanto ignora, os contadores são zerados, então nada "acumula" antes ou durante a intro.
 *  - REBAIXAR 1 nível: FPS médio < 50 SUSTENTADO por 3 s seguidos. Qualquer janela acima de
 *    50 zera o contador, então quedas isoladas (troca de aba, GC) não rebaixam.
 *  - SUBIR 1 nível: FPS médio > 58 estável por 10 s seguidos E pelo menos 60 s desde a última
 *    subida (no máximo 1 subida por minuto). A queda não tem esse limite, para reagir rápido.
 *    Entre 50 e 58 fps nada acontece (zona morta), o que evita oscilar entre dois níveis.
 *
 * Depois de qualquer troca os contadores zeram e o motor limpa a janela de FPS, então a
 * decisão seguinte só vem após 2 s de amostras novas do nível atual.
 */
export const GOVERNOR = {
  STARTUP_IGNORE: 2, // s após o carregamento
  DROP_BELOW: 50, // fps
  DROP_AFTER: 3, // s sustentados
  RISE_ABOVE: 58, // fps
  RISE_AFTER: 10, // s estáveis
  RISE_MIN_GAP: 60, // s entre subidas
}

export function createQualityGovernor({ min = 0, max = 2, level = max } = {}) {
  const g = { level, lowFor: 0, highFor: 0, lastRise: -Infinity, paused: false }

  g.reset = () => {
    g.lowFor = 0
    g.highFor = 0
  }

  g.setPaused = (paused) => {
    if (g.paused === paused) return
    g.paused = paused
    g.reset()
  }

  /** @returns {-1|0|1} mudança de nível aplicada */
  g.feed = ({ sinceLoad, dt, avg }) => {
    // `sinceLoad` marca o FIM da janela; a janela só conta se começou depois dos 2 s iniciais.
    if (g.paused || avg == null || sinceLoad - dt < GOVERNOR.STARTUP_IGNORE) {
      g.reset()
      return 0
    }
    if (avg < GOVERNOR.DROP_BELOW) {
      g.lowFor += dt
      g.highFor = 0
    } else if (avg > GOVERNOR.RISE_ABOVE) {
      g.highFor += dt
      g.lowFor = 0
    } else {
      g.lowFor = 0
      g.highFor = 0
    }
    if (g.lowFor >= GOVERNOR.DROP_AFTER && g.level > min) {
      g.level--
      g.reset()
      return -1
    }
    if (g.highFor >= GOVERNOR.RISE_AFTER && g.level < max && sinceLoad - g.lastRise >= GOVERNOR.RISE_MIN_GAP) {
      g.level++
      g.lastRise = sinceLoad
      g.reset()
      return 1
    }
    return 0
  }

  return g
}
