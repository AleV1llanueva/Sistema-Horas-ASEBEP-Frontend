import {
  agruparHorasPorMes,
  calcularMesesCompletados,
  construirPeriodoBeca,
  describirExcesoHoras,
  HORAS_POR_MES,
  mesEsActivo,
  obtenerResumenHoras,
} from './src/utils/becaHoras.js'

import {
  calcularEstadoAportaciones,
} from './src/utils/becaAportaciones.js'

let fallas = 0

function ok(nombre, condicion, detalle = '') {
  console.log(
    `${condicion ? 'PASA' : 'FALLA'}  ${nombre}` +
      (detalle ? `  <- ${detalle}` : ''),
  )

  if (!condicion) {
    fallas++
  }
}

const periodo = construirPeriodoBeca({
  mesInicio: 1,
  anioInicio: 2024,
})

const meta = () =>
  calcularMesesCompletados(periodo) * HORAS_POR_MES

// Foco 1: sin periodo de inicio
const sinPeriodo = construirPeriodoBeca({
  fechaInicio: 'III PAC',
})

ok(
  'F1 portal sin mes de inicio -> tabla "no definido"',
  sinPeriodo.inicio === null,
)

ok(
  'F1 aportaciones sin periodo -> null',
  calcularEstadoAportaciones({
    mesesAportadosPrevios: 0,
    mesesAprobadosEnSistema: 0,
    periodo: sinPeriodo,
  }) === null,
)

ok(
  'F1 agrupar sin periodo -> sin filas',
  agruparHorasPorMes({ registros: [], periodo: sinPeriodo })
    .length === 0,
)

// Focos 2 y 3
const adelantado = obtenerResumenHoras({
  horasAcumuladas: meta() + 50,
  horasFaltantes: 0,
  horasEsperadas: meta(),
  enExceso: true,
})

ok(
  'F2 adelantado 50 h -> exceso 50 y estado excedida',
  adelantado.exceso === 50 &&
    adelantado.estado === 'excedida',
)

ok(
  'F2 texto del exceso',
  describirExcesoHoras(adelantado.exceso) ===
    '+50 h adelantadas',
)

ok(
  'F2 evita el "0 horas restantes"',
  adelantado.estado !== 'en_curso',
)

const justo = obtenerResumenHoras({
  horasAcumuladas: meta(),
  horasFaltantes: 0,
  horasEsperadas: meta(),
  enExceso: true,
})

ok(
  'F3 justo en la meta -> sin exceso y cumplida',
  justo.exceso === 0 &&
    justo.estado === 'cumplida' &&
    describirExcesoHoras(justo.exceso) === '',
)

ok(
  'F3b exceso de 1 h en singular',
  describirExcesoHoras(
    obtenerResumenHoras({
      horasAcumuladas: meta() + 1,
      horasFaltantes: 0,
      horasEsperadas: meta(),
      enExceso: true,
    }).exceso,
  ) === '+1 h adelantada',
)

const derivada = obtenerResumenHoras({
  horasAcumuladas: 250,
  horasFaltantes: 0,
  enExceso: true,
})

ok(
  'F3c sin meta conocida no inventa exceso',
  derivada.exceso === 0 && derivada.meta === 250,
)

// Foco 4
const inscripciones = [
  { estadoActividad: 'finalizada', checkIn: false, checkOut: false },
  { estadoActividad: 'programada', checkIn: false, checkOut: false },
  { estadoActividad: 'finalizada', checkIn: true, checkOut: true },
  { estadoActividad: 'en-curso', checkIn: true, checkOut: false },
  { estadoActividad: 'finalizada', checkIn: true, checkOut: false },
]

const faltas = inscripciones.filter(
  (i) =>
    i.estadoActividad === 'finalizada' &&
    !i.checkIn &&
    !i.checkOut,
).length

const proximas = inscripciones.filter(
  (i) =>
    i.estadoActividad === 'programada' ||
    i.estadoActividad === 'en-curso',
).length

const incompletas = inscripciones.filter(
  (i) =>
    i.estadoActividad === 'finalizada' &&
    i.checkIn &&
    !i.checkOut,
).length

ok(
  'F4 la falta no cuenta como próxima',
  faltas === 1 && proximas === 2,
)

ok('F4 la salida pendiente es visible', incompletas === 1)

// Foco 5
const estadoAcreditacion = (horas) =>
  horas > 0 ? 'acreditado' : 'pendiente'

ok(
  'F5 0 horas -> pendiente',
  estadoAcreditacion(0) === 'pendiente',
)

ok(
  'F5 3 horas -> acreditado',
  estadoAcreditacion(3) === 'acreditado',
)

ok(
  'F5 el mes con 0 horas no suma',
  agruparHorasPorMes({
    registros: [{ fecha: '2024-02-10', horasAcreditadas: 0 }],
    periodo,
  }).find((m) => m.anio === 2024 && m.mes === 2)
    .estado === 'sin-horas',
)

ok(
  'Extra: un mes con 8 h queda incompleto',
  agruparHorasPorMes({
    registros: [{ fecha: '2024-02-10', horasAcreditadas: 8 }],
    periodo,
  }).filter((m) => m.estado === 'incompleto').length === 1,
)

ok('Extra: enero 2024 sí es mes activo', mesEsActivo(1, 2024))

ok(
  'Extra: diciembre no es mes activo',
  !mesEsActivo(12, 2024),
)

ok(
  'Extra: el periodo se cierra a los 10 meses',
  periodo.meses.length === 10 && periodo.completo,
)

console.log(
  fallas === 0 ? '\nTODO PASA' : `\n${fallas} FALLAS`,
)

process.exitCode = fallas === 0 ? 0 : 1
