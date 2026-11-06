/*
 * Cálculo de los meses de aportación pendientes.
 *
 * Se separa de las pantallas para que el detalle
 * administrativo y cualquier otra vista informen
 * exactamente lo mismo.
 */
import {
  calcularMesesCompletados,
} from './becaHoras.js'

/*
 * Devuelve null cuando no se conoce el inicio del periodo:
 * es preferible no informar nada que inventar meses.
 */
export function calcularEstadoAportaciones({
  mesesAportadosPrevios,
  mesesAprobadosEnSistema,
  periodo,
  ahora = new Date(),
}) {
  if (!periodo || !periodo.inicio) {
    return null
  }

  const previos = Math.max(
    0,
    Number(mesesAportadosPrevios) || 0,
  )

  const aprobados = Math.max(
    0,
    Number(mesesAprobadosEnSistema) || 0,
  )

  const mesesCompletados =
    calcularMesesCompletados(periodo, ahora)

  const cubiertos = previos + aprobados

  return {
    mesesCompletados,
    cubiertos,
    sinPagar: Math.max(
      0,
      mesesCompletados - cubiertos,
    ),
  }
}
