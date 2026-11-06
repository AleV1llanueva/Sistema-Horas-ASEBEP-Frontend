/*
 * Reglas de horas de la beca.
 *
 * Se comparten entre el portal del estudiante y el
 * panel administrativo para que ambos informen lo mismo.
 */

export const HORAS_POR_MES = 20

export const MESES_MAXIMOS_BECA = 10

export const MESES_INACTIVOS = Object.freeze([1, 12])

/*
 * Excepción histórica que el backend conserva en
 * calcular_meses_activos. Se guarda como dato explícito
 * para no duplicar la regla de negocio.
 */
export const MESES_ACTIVOS_ESPECIALES = Object.freeze([
  { anio: 2024, mes: 1 },
  { anio: 2025, mes: 1 },
])

export const MESES_ABREVIADOS = Object.freeze([
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
])

export function mesEsActivo(mes, anio) {
  const mesNumero = Number(mes)
  const anioNumero = Number(anio)

  if (
    !Number.isInteger(mesNumero) ||
    mesNumero < 1 ||
    mesNumero > 12
  ) {
    return false
  }

  const esEspecial = MESES_ACTIVOS_ESPECIALES.some(
    (especial) =>
      especial.anio === anioNumero &&
      especial.mes === mesNumero,
  )

  return (
    esEspecial ||
    !MESES_INACTIVOS.includes(mesNumero)
  )
}

/*
 * Acepta "YYYY-MM-DD" o un objeto { anio, mes }.
 * Devuelve null cuando el valor no representa un mes real.
 */
function prepararMes(valor) {
  if (
    valor &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  ) {
    const anio = Number(valor.anio)
    const mes = Number(valor.mes)

    if (
      Number.isInteger(anio) &&
      anio > 2000 &&
      Number.isInteger(mes) &&
      mes >= 1 &&
      mes <= 12
    ) {
      return { anio, mes }
    }

    return null
  }

  const coincidencia = String(valor ?? '')
    .trim()
    .match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)

  if (!coincidencia) {
    return null
  }

  const anio = Number(coincidencia[1])
  const mes = Number(coincidencia[2])

  return mes >= 1 && mes <= 12
    ? { anio, mes }
    : null
}

function avanzarMes({ anio, mes }, cantidad = 1) {
  const indice = anio * 12 + (mes - 1) + cantidad

  return {
    anio: Math.floor(indice / 12),
    mes: (indice % 12) + 1,
  }
}

function compararMes(a, b) {
  return (
    a.anio === b.anio
      ? a.mes - b.mes
      : a.anio - b.anio
  )
}

/*
 * Construye los meses activos del becario.
 *
 * Recibe el inicio (fecha o mes/año) y, opcionalmente,
 * la fecha del primer mes no activo que entrega el
 * backend al administrador.
 */
export function construirPeriodoBeca({
  fechaInicio,
  fechaFin,
  mesInicio,
  anioInicio,
} = {}) {
  const periodoVacio = {
    inicio: null,
    fin: null,
    meses: [],
    completo: false,
  }

  const inicio =
    prepararMes(fechaInicio) ??
    prepararMes({ anio: anioInicio, mes: mesInicio })

  if (!inicio) {
    return periodoVacio
  }

  const finRecibido = prepararMes(fechaFin)

  const meses = []
  let candidato = inicio

  while (
    meses.length < MESES_MAXIMOS_BECA &&
    (!finRecibido || compararMes(candidato, finRecibido) < 0)
  ) {
    if (mesEsActivo(candidato.mes, candidato.anio)) {
      meses.push(candidato)
    }

    candidato = avanzarMes(candidato)
  }

  return {
    inicio,
    fin: candidato,
    meses,
    completo: meses.length === MESES_MAXIMOS_BECA,
  }
}

/*
 * Cuenta los meses del periodo que ya comenzaron.
 */
export function calcularMesesCompletados(
  periodo,
  ahora = new Date(),
) {
  if (!Array.isArray(periodo?.meses)) {
    return 0
  }

  const mesActual = {
    anio: ahora.getFullYear(),
    mes: ahora.getMonth() + 1,
  }

  return periodo.meses.filter(
    (mes) => compararMes(mes, mesActual) <= 0,
  ).length
}

export function describirExcesoHoras(exceso) {
  const horas = Math.max(0, Math.floor(Number(exceso) || 0))

  if (horas === 0) {
    return ''
  }

  return horas === 1
    ? '+1 h adelantada'
    : `+${horas} h adelantadas`
}

/*
 * Resume el progreso de horas.
 *
 * Con enExceso activo, la meta se deriva de la misma forma
 * que el portal la ha calculado siempre (acumuladas +
 * faltantes), porque la fuente garantiza
 * faltantes = max(0, meta - acumuladas) y así el exceso
 * se obtiene sin inventar cifras.
 */
export function obtenerResumenHoras({
  horasAcumuladas,
  horasFaltantes,
  enExceso = false,
} = {}) {
  const acumuladas = Math.max(
    0,
    Number(horasAcumuladas) || 0,
  )

  const faltantes = Math.max(
    0,
    Number(horasFaltantes) || 0,
  )

  const meta = acumuladas + faltantes

  const exceso = enExceso
    ? Math.max(0, acumuladas - meta)
    : 0

  let estado = 'en_curso'

  if (exceso > 0) {
    estado = 'excedida'
  } else if (meta > 0 && faltantes === 0) {
    estado = 'cumplida'
  }

  return {
    acumuladas,
    meta,
    exceso,
    porcentaje:
      meta > 0
        ? Math.min(
          100,
          Math.round((acumuladas / meta) * 100),
        )
        : 0,
    estado,
  }
}

/*
 * Suma las horas acreditadas de cada mes del periodo.
 */
export function agruparHorasPorMes({
  registros,
  periodo,
} = {}) {
  if (!Array.isArray(periodo?.meses)) {
    return []
  }

  const horasPorMes = new Map()

  if (Array.isArray(registros)) {
    registros.forEach((registro) => {
      const mes = prepararMes(registro?.fecha)

      if (!mes) {
        return
      }

      const clave = `${mes.anio}-${mes.mes}`

      horasPorMes.set(
        clave,
        (horasPorMes.get(clave) || 0) +
        Math.max(0, Number(registro.horasAcreditadas) || 0),
      )
    })
  }

  return periodo.meses.map(({ anio, mes }) => {
    const horas =
      horasPorMes.get(`${anio}-${mes}`) || 0

    let estado = 'sin-horas'

    if (horas >= HORAS_POR_MES) {
      estado = 'completo'
    } else if (horas > 0) {
      estado = 'incompleto'
    }

    return { anio, mes, horas, estado }
  })
}
