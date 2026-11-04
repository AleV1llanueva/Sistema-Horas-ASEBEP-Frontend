/*
 * Periodos del historial de actividades.
 *
 * La semana comienza en lunes y el mes es el calendario
 * en curso. Las fechas son locales, igual que el resto
 * del sistema.
 */

export const PERIODOS_HISTORIAL = Object.freeze({
  semana: 'semana',
  mes: 'mes',
  todas: 'todas',
})

export const PERIODO_HISTORIAL_PREDETERMINADO =
  PERIODOS_HISTORIAL.semana

export const OPCIONES_PERIODO_HISTORIAL =
  Object.freeze([
    {
      valor: PERIODOS_HISTORIAL.semana,
      texto: 'Esta semana',
    },
    {
      valor: PERIODOS_HISTORIAL.mes,
      texto: 'Este mes',
    },
    {
      valor: PERIODOS_HISTORIAL.todas,
      texto: 'Todas',
    },
  ])

/*
 * Interpreta "YYYY-MM-DD" como fecha local.
 *
 * Date.parse("2026-11-04") usa UTC y puede desplazar
 * la actividad un día respecto a la zona del usuario.
 */
function convertirFechaLocal(fecha) {
  const texto = String(fecha ?? '').trim()

  const coincidencia = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  )

  if (coincidencia) {
    const [, anio, mes, dia] = coincidencia.map(Number)

    return new Date(anio, mes - 1, dia)
  }

  const fechaInterpretada = new Date(texto)

  return Number.isNaN(fechaInterpretada.getTime())
    ? null
    : fechaInterpretada
}

export function obtenerInicioSemana(ahora = new Date()) {
  const inicio = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
  )

  // getDay(): domingo es 0, por eso el lunes se calcula con 6.
  const desfase = (inicio.getDay() + 6) % 7

  inicio.setDate(inicio.getDate() - desfase)

  return inicio
}

/*
 * Indica si la actividad cae dentro del periodo.
 *
 * Devuelve true para "todas" o cuando la fecha no puede
 * interpretarse: es preferible mostrar la actividad a
 * esconderla por un formato inesperado.
 */
export function actividadEnPeriodo(
  actividad,
  periodo,
  ahora = new Date(),
) {
  if (periodo === PERIODOS_HISTORIAL.todas) {
    return true
  }

  const fechaActividad = convertirFechaLocal(
    actividad?.fecha,
  )

  if (!fechaActividad) {
    return true
  }

  if (periodo === PERIODOS_HISTORIAL.semana) {
    const desde = obtenerInicioSemana(ahora)
    const hasta = new Date(desde)

    hasta.setDate(hasta.getDate() + 7)

    return (
      fechaActividad >= desde && fechaActividad < hasta
    )
  }

  return (
    fechaActividad.getFullYear() === ahora.getFullYear() &&
    fechaActividad.getMonth() === ahora.getMonth()
  )
}
