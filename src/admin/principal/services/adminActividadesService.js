import {
  apiFetch,
  apiFetchBlob,
  ApiError,
} from '../../../services/api.js'

import {
  adminPrincipalDashboardMock,
  asistenciasAdminMock,
  estudiantesAdminMock,
} from '../mocks/adminPrincipalMock.js'

import {
  inscripcionesEstudianteMock,
} from '../../../mocks/estudianteActividadesMock.js'

/*
 * Servicio administrativo de Actividades:
 * true  -> usuario mock y localStorage.
 * false -> backend.
 */

// Claves utilizadas por el escenario administrativo simulado.
const CLAVE_ACTIVIDADES =
  'asebep_admin_actividades_simuladas'

const CLAVE_ASISTENCIAS =
  'asebep_admin_asistencias_simuladas'

const CLAVE_ESTUDIANTES =
  'asebep_admin_estudiantes_simulados'

const CLAVE_INSCRIPCIONES_ESTUDIANTE =
  'asebep_estudiante_inscripciones_simuladas'

// Estados internos reconocidos por las vistas administrativas.
const ESTADOS_PERMITIDOS = [
  'programada',
  'en-curso',
  'finalizada',
  'cancelada',
]

// Tipos de marcacion utilizados por los codigos QR de entrada y salida.
const TIPOS_MARCACION = Object.freeze({
  entrada: 'entrada',
  salida: 'salida',
})

// El contrato actual del backend mantiene ambos QR por 20 minutos.
const DURACION_QR_MINUTOS = Object.freeze({
  [TIPOS_MARCACION.entrada]: 20,
  [TIPOS_MARCACION.salida]: 20,
})

const PREFIJO_TOKEN_QR_SIMULADO =
  'asebep-mock.'

/*
 * true  = localStorage y mocks.
 * false = API real.
 */
const usarDatosAdminSimulados =
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS === 'true'

/*
 * Error propio del módulo.
 *
 * Esto permite que los componentes reciban mensajes
 * comprensibles sin depender directamente de ApiError.
 */
export class ActividadAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'ActividadAdminError'
  }
}

/* UTILIDADES GENERALES */

/*
 * Convierte cualquier valor válido en texto y elimina
 * espacios innecesarios de sus extremos.
 */
function prepararTexto(valor) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return ''
  }

  return String(valor).trim()
}

// Crea una copia independiente de objetos y arreglos.
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Obtiene localStorage de forma segura.
 * Durante renderizados sin navegador devolverá null.
 */
function obtenerAlmacenamiento() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/*
 * Impide ejecutar funciones exclusivas del mock cuando
 * la variable de entorno indica que debe consumirse la API.
 */
function comprobarModoSimulado() {
  if (!usarDatosAdminSimulados) {
    throw new ActividadAdminError(
      'Los datos administrativos simulados están desactivados.',
    )
  }
}

/*
 * Centraliza las solicitudes y transforma ApiError en un
 * error propio del módulo administrativo de actividades.
 */
async function peticionApi(
  endpoint,
  opciones = {},
) {
  try {
    return await apiFetch(
      endpoint,
      opciones,
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ActividadAdminError(
        error.message,
      )
    }

    throw new ActividadAdminError(
      'No se pudo conectar con el servidor backend.',
    )
  }
}

/*
 * Centraliza las solicitudes que devuelven archivos binarios.
 * Los endpoints administrativos del QR responden con una
 * imagen PNG en lugar de utilizar una respuesta JSON.
 */
async function peticionApiBlob(
  endpoint,
  opciones = {},
) {
  try {
    return await apiFetchBlob(
      endpoint,
      opciones,
    )
  } catch (error) {
    /*
     * Conservamos el mensaje que FastAPI haya enviado,
     * pero evitamos que la vista dependa directamente
     * de la clase ApiError.
     */
    if (error instanceof ApiError) {
      throw new ActividadAdminError(
        error.message,
      )
    }

    throw new ActividadAdminError(
      'No fue posible obtener el código QR desde el servidor.',
    )
  }
}

/*
 * Convierte un valor en un entero no negativo.
 * Se usa al normalizar respuestas existentes. Las validaciones
 * estrictas para formularios se realizan más adelante.
 */
function normalizarEnteroNoNegativo(
  valor,
  valorPredeterminado = 0,
) {
  const numero = Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    return valorPredeterminado
  }

  return numero
}

/*
 * Convierte horas registradas en un número no negativo.
 * El backend podría devolver un entero o un decimal.
 */
function normalizarNumeroNoNegativo(
  valor,
  valorPredeterminado = 0,
) {
  const numero = Number(valor)

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return valorPredeterminado
  }

  return numero
}

function normalizarBooleano(valor) {
  return (
    valor === true ||
    valor === 1 ||
    valor === '1' ||
    prepararTexto(valor).toLowerCase() ===
      'true'
  )
}

/* 
* NORMALIZACIÓN DE ACTIVIDADES
* Convierte los estados del backend y del mock al formato
* interno utilizado por los componentes.
 */
function normalizarEstadoActividad(
  estado,
) {
  const estadoPreparado =
    prepararTexto(estado)
      .toLowerCase()
      .replace(/\s+/g, '-')

  const equivalencias = {
    programada: 'programada',
    'en-curso': 'en-curso',
    completada: 'finalizada',
    finalizada: 'finalizada',
    cancelada: 'cancelada',
  }

  return (
    equivalencias[estadoPreparado] ??
    estadoPreparado
  )
}

function calcularEstadoTemporalActividad(
  actividad,
  ahora = new Date(),
) {
  const estadoGuardado =
    normalizarEstadoActividad(
      actividad?.estado,
    )

  /*
   * Una actividad cancelada conserva su estado.
   * El reloj no debe volver a convertirla en programada.
   */
  if (estadoGuardado === 'cancelada') {
    return 'cancelada'
  }

  const instanteActual =
    ahora instanceof Date &&
    Number.isFinite(ahora.getTime())
      ? ahora
      : new Date()

  const {
    inicio,
    finalizacion,
  } = obtenerHorarioActividad(
    actividad,
  )

  /*
   * Si el horario está incompleto conservamos el
   * estado recibido para no clasificarlo incorrectamente.
   */
  if (!inicio || !finalizacion) {
    return (
      estadoGuardado ||
      'programada'
    )
  }

  if (
    instanteActual.getTime() <
    inicio.getTime()
  ) {
    return 'programada'
  }

  if (
    instanteActual.getTime() <=
    finalizacion.getTime()
  ) {
    return 'en-curso'
  }

  return 'finalizada'
}

/*
 * Devuelve una copia de la actividad con su estado
 * actualizado sin modificar el objeto original.
 */
function aplicarEstadoTemporalActividad(
  actividad,
  ahora = new Date(),
) {
  return {
    ...actividad,

    estado:
      calcularEstadoTemporalActividad(
        actividad,
        ahora,
      ),
  }
}

/*
 * FastAPI serializa las horas como HH:mm:ss.
 * La interfaz trabaja con HH:mm.
 */
function normalizarHoraBackend(hora) {
  const horaPreparada =
    prepararTexto(hora)

  const coincidencia =
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/.exec(
      horaPreparada,
    )

  return coincidencia
    ? `${coincidencia[1]}:${coincidencia[2]}`
    : horaPreparada
}

/*
 * Normaliza una actividad proveniente del mock, localStorage
 * o de una estructura interna ya convertida.
 */
function normalizarActividadInicial(
  actividad,
) {
  if (
    !actividad ||
    typeof actividad !== 'object' ||
    Array.isArray(actividad)
  ) {
    throw new ActividadAdminError(
      'La actividad almacenada tiene un formato inválido.',
    )
  }

  /*
   * cuposTotales representa la capacidad publicada.
   * cuposDisponibles representa los espacios que todavía
   * pueden ocuparse.
   *
   * Math.max evita que una actividad antigua termine con
   * más cupos disponibles que cupos totales.
   */
  const cuposDisponibles =
    normalizarEnteroNoNegativo(
      actividad.cuposDisponibles ??
        actividad.cupos_disponibles ??
        actividad.cupos,
    )

  const cuposTotalesLeidos =
    normalizarEnteroNoNegativo(
      actividad.cuposTotales ??
        actividad.cupos ??
        actividad.cuposDisponibles,
      cuposDisponibles,
    )

  const cuposTotales = Math.max(
    cuposTotalesLeidos,
    cuposDisponibles,
  )

  return {
    /*
     * Conservamos el identificador existente.
     * Los identificadores faltantes solo se generan en el mock.
     */
    id:
      prepararTexto(actividad.id) ||
      crearIdentificador(),

    titulo: prepararTexto(
      actividad.titulo ??
        actividad.nombre,
    ),

    descripcion: prepararTexto(
      actividad.descripcion,
    ),

    fecha: prepararTexto(
      actividad.fecha,
    ),

    horaInicio: prepararTexto(
      actividad.horaInicio ??
        actividad.hora,
    ),

    horaFinalizacion: prepararTexto(
      actividad.horaFinalizacion,
    ),

    lugar: prepararTexto(
      actividad.lugar,
    ),

    cuposTotales,
    cuposDisponibles,

    horasAcreditables:
      normalizarEnteroNoNegativo(
        actividad.horasAcreditables,
      ),

    // Se conserva la imagen cuando el origen la proporciona.
    imagen:
      actividad.imagen ?? null,

    estado:
      normalizarEstadoActividad(
        actividad.estado,
      ) ||
      'programada',

    activa:
      actividad.activa !== false,

    eliminada:
      actividad.eliminada === true,

    /*
     * Información simulada del QR de entrada.
     */
    entradaHabilitada:
      actividad.entradaHabilitada ===
      true,

    entradaHabilitadaEn:
      prepararTexto(
        actividad.entradaHabilitadaEn,
      ) || null,

    entradaHabilitadaHasta:
      prepararTexto(
        actividad.entradaHabilitadaHasta,
      ) || null,

    tokenEntradaSimulado:
      prepararTexto(
        actividad.tokenEntradaSimulado,
      ) || null,

    // Información simulada del QR de salida.
    salidaHabilitada:
      actividad.salidaHabilitada ===
      true,

    salidaHabilitadaEn:
      prepararTexto(
        actividad.salidaHabilitadaEn,
      ) || null,

    salidaHabilitadaHasta:
      prepararTexto(
        actividad.salidaHabilitadaHasta,
      ) || null,

    tokenSalidaSimulado:
      prepararTexto(
        actividad.tokenSalidaSimulado,
      ) || null,

    // Información de eliminación lógica del mock.
    desactivadaEn:
      prepararTexto(
        actividad.desactivadaEn,
      ) || null,

    eliminadaEn:
      prepararTexto(
        actividad.eliminadaEn,
      ) || null,

    creadaEn:
      prepararTexto(
        actividad.creadaEn,
      ) || null,

    actualizadaEn:
      prepararTexto(
        actividad.actualizadaEn,
      ) || null,
  }
}

/*
 * Traduce una actividad en snake_case desde FastAPI al
 * formato camelCase empleado por React.
 */
function normalizarActividadBackend(
  actividad,
) {
  if (
    !actividad ||
    typeof actividad !== 'object' ||
    Array.isArray(actividad)
  ) {
    throw new ActividadAdminError(
      'El servidor devolvió una actividad con un formato inválido.',
    )
  }

  return normalizarActividadInicial({
    id: actividad.id,
    titulo: actividad.titulo,
    descripcion: actividad.descripcion,
    lugar: actividad.ubicacion,
    fecha: actividad.fecha_actividad,

    horaInicio:
      normalizarHoraBackend(
        actividad.hora_inicio,
      ),

    horaFinalizacion:
      normalizarHoraBackend(
        actividad.hora_final,
      ),

    /*
     * El backend sí diferencia:
     *
     * - cupos: capacidad total publicada.
     * - cupos_disponibles: capacidad restante.
     */
    cuposTotales:
      actividad.cupos,

    cuposDisponibles:
      actividad.cupos_disponibles ??
      actividad.cupos,

    horasAcreditables:
      actividad.horas_asignar,

    imagen:
      actividad.imagen ?? null,

    estado: actividad.estado,
    activa: actividad.activa,
    eliminada: actividad.eliminada,
  })
}

/* NORMALIZACIÓN DE ASISTENCIAS */
/*
 * Convierte una asistencia proveniente del backend o del mock
 * al contrato interno utilizado por la vista de detalle.
 */
function normalizarAsistencia(
  asistencia,
  actividadIdAlternativo = '',
) {
  if (
    !asistencia ||
    typeof asistencia !== 'object' ||
    Array.isArray(asistencia)
  ) {
    throw new ActividadAdminError(
      'La asistencia almacenada tiene un formato inválido.',
    )
  }

  /*
   * GET /asistencias/actividades/{actividad_id} no necesita
   * repetir actividad_id en cada elemento. Por eso la función
   * acepta como respaldo el identificador usado en la consulta.
   */
  const actividadId =
    prepararTexto(
      asistencia.actividadId ??
        asistencia.actividad_id,
    ) ||
    prepararTexto(
      actividadIdAlternativo,
    )

  const numeroCuenta =
    prepararTexto(
      asistencia.numeroCuenta ??
        asistencia.num_cuenta,
    )

  if (!actividadId || !numeroCuenta) {
    throw new ActividadAdminError(
      'La asistencia no contiene la actividad o el número de cuenta.',
    )
  }

  const checkIn =
    normalizarBooleano(
      asistencia.checkIn ??
        asistencia.check_in ??
        asistencia.entradaRegistrada ??
        asistencia.entrada_registrada,
    )

  const checkOut =
    normalizarBooleano(
      asistencia.checkOut ??
        asistencia.check_out ??
        asistencia.salidaRegistrada ??
        asistencia.salida_registrada,
    )

  const horasRegistradas =
    normalizarNumeroNoNegativo(
      asistencia.horasRegistradas ??
        asistencia.horas_registradas,
    )

  return {
    id:
      prepararTexto(asistencia.id) ||
      `asistencia-${actividadId}-${numeroCuenta}`,

    actividadId,
    numeroCuenta,
    checkIn,
    checkOut,
    horasRegistradas,

    /*
     * Conservamos el estado textual del backend.
     * Si no existe, lo deducimos únicamente para el mock.
     */
    estado:
      prepararTexto(
        asistencia.estado ??
          asistencia.estadoAsistencia ??
          asistencia.estado_asistencia,
      ) ||
      (checkIn
        ? 'Asistió'
        : 'Inscrito'),
  }
}

/*
 * Combina las asistencias administrativas con las
 * inscripciones creadas desde el portal estudiantil.
 *
 * La actividad y el número de cuenta forman una clave
 * única para impedir filas duplicadas.
 */
function unificarAsistenciasSimuladas(
  registros,
) {
  const asistenciasPorEstudiante =
    new Map()

  for (const registro of registros) {
    const asistencia =
      normalizarAsistencia(registro)

    const clave =
      `${asistencia.actividadId}:` +
      `${asistencia.numeroCuenta}`

    const asistenciaExistente =
      asistenciasPorEstudiante.get(
        clave,
      )

    if (!asistenciaExistente) {
      asistenciasPorEstudiante.set(
        clave,
        asistencia,
      )

      continue
    }

    /*
     * Si una marcación existe en cualquiera de las
     * colecciones, debe considerarse registrada.
     */
    const checkIn =
      asistenciaExistente.checkIn ||
      asistencia.checkIn

    const checkOut =
      asistenciaExistente.checkOut ||
      asistencia.checkOut

    const horasRegistradas = Math.max(
      normalizarNumeroNoNegativo(
        asistenciaExistente
          .horasRegistradas,
      ),

      normalizarNumeroNoNegativo(
        asistencia.horasRegistradas,
      ),
    )

    asistenciasPorEstudiante.set(
      clave,
      {
        /*
         * Conservamos primero la información administrativa,
         * pero completamos las marcaciones con la inscripción
         * proveniente del estudiante.
         */
        ...asistenciaExistente,

        checkIn,
        checkOut,
        horasRegistradas,

        estado:
          checkIn || checkOut
            ? 'Asistió'
            : prepararTexto(
                asistenciaExistente
                  .estado,
              ) ||
              prepararTexto(
                asistencia.estado,
              ) ||
              'Inscrito',
      },
    )
  }

  return [
    ...asistenciasPorEstudiante.values(),
  ]
}

// Combina una asistencia con la informacion de su actividad.
function construirRegistroHistorialEstudiante(
  asistencia,
  actividad,
) {
  const fecha = prepararTexto(
    actividad?.fecha ?? actividad?.fecha_actividad,
  )

  const titulo =
    prepararTexto(
      actividad?.titulo ?? actividad?.nombre,
    ) || 'Actividad no disponible.'

  return {
    id: asistencia.id,
    actividadId: asistencia.actividadId,
    fecha,
    titulo,

    horasAcreditadas: normalizarNumeroNoNegativo(
      asistencia.horasRegistradas,
    ),

    estado: prepararTexto(
        asistencia.estado,
    ) || 'Sin estado',

    checkIn: asistencia.checkIn === true,
    checkOut: asistencia.checkOut === true,
  }
}

/* PERSISTENCIA SIMULADA DE ACTIVIDADES */
function crearIdentificador() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `actividad-${crypto.randomUUID()}`
  }

  return (
    `actividad-${Date.now()}-` +
    Math.random().toString(16).slice(2)
  )
}

function obtenerActividadesIniciales() {
  const actividades =
    adminPrincipalDashboardMock
      .proximasActividades

  if (!Array.isArray(actividades)) {
    return []
  }

  return actividades.map(
    normalizarActividadInicial,
  )
}

function guardarActividades(
  actividades,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_ACTIVIDADES,
      JSON.stringify(actividades),
    )
  } catch {
    throw new ActividadAdminError(
      'No fue posible guardar las actividades en el navegador.',
    )
  }
}

function leerActividades() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_ACTIVIDADES,
      )

    /*
     * La primera lectura inicializa localStorage con el
     * escenario definido en adminPrincipalMock.js.
     */
    if (contenido === null) {
      const actividadesIniciales =
        obtenerActividadesIniciales()

      guardarActividades(
        actividadesIniciales,
      )

      return actividadesIniciales
    }

    const actividades =
      JSON.parse(contenido)

    if (!Array.isArray(actividades)) {
      throw new Error()
    }

    return actividades.map(
      normalizarActividadInicial,
    )
  } catch (error) {
    if (
      error instanceof ActividadAdminError
    ) {
      throw error
    }

    throw new ActividadAdminError(
      'Las actividades almacenadas no tienen un formato válido.',
    )
  }
}

/* PERSISTENCIA SIMULADA DE ASISTENCIAS */

function obtenerAsistenciasIniciales() {
  if (!Array.isArray(asistenciasAdminMock)) {
    return []
  }

  return asistenciasAdminMock.map(
    (asistencia) =>
      normalizarAsistencia(asistencia),
  )
}

function guardarAsistencias(
  asistencias,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_ASISTENCIAS,
      JSON.stringify(asistencias),
    )
  } catch {
    throw new ActividadAdminError(
      'No fue posible guardar las asistencias en el navegador.',
    )
  }
}

function leerAsistencias() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_ASISTENCIAS,
      )

    if (contenido === null) {
      const asistenciasIniciales =
        obtenerAsistenciasIniciales()

      guardarAsistencias(
        asistenciasIniciales,
      )

      return asistenciasIniciales
    }

    const asistencias =
      JSON.parse(contenido)

    if (!Array.isArray(asistencias)) {
      throw new Error()
    }

    return asistencias.map(
      (asistencia) =>
        normalizarAsistencia(asistencia),
    )
  } catch (error) {
    if (
      error instanceof ActividadAdminError
    ) {
      throw error
    }

    throw new ActividadAdminError(
      'Las asistencias almacenadas no tienen un formato válido.',
    )
  }
}

// Lee las inscripciones creadas desde el portal del estudiante
function leerInscripcionesEstudianteSimuladas() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_INSCRIPCIONES_ESTUDIANTE,
      )

      // Si el estudiante todavia no ha utilizado el modulo, no existe una coleccion que necesitemos limpiar.
      if (contenido === null) {
        return null
      }

      const inscripciones =
        JSON.parse(contenido)

      if (!Array.isArray(inscripciones)) {
        throw new Error()
      }

      return inscripciones
  } catch {
    throw new ActividadAdminError(
      'Las inscripciones almacenadas no tienen un formato válido.',
    )
  }
}

/*
* Guarda unicamente las inscripcinoes del estudiante.
* Esta funcion nunca modifica la coleccion de cuentas (Por si tenian la duda).
*/
function guardarInscripcionesEstudianteSimuladas(
  inscripciones,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_INSCRIPCIONES_ESTUDIANTE,
      JSON.stringify(
        inscripciones,
      ),
    )
  } catch {
    throw new ActividadAdminError(
      'No fue posible guardar las inscripciones en el navegador.',
    )
  }
}

/* ACREDITACIÓN SIMULADA EN EL PERFIL DEL ESTUDIANTE */
function leerEstudiantesSimulados() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_ESTUDIANTES,
      )

    if (contenido === null) {
      return clonarDatos(
        estudiantesAdminMock,
      )
    }

    const estudiantes =
      JSON.parse(contenido)

    if (!Array.isArray(estudiantes)) {
      throw new Error()
    }

    return estudiantes
  } catch {
    throw new ActividadAdminError(
      'Los estudiantes almacenados no tienen un formato válido.',
    )
  }
}

function guardarEstudiantesSimulados(
  estudiantes,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_ESTUDIANTES,
      JSON.stringify(estudiantes),
    )
  } catch {
    throw new ActividadAdminError(
      'No fue posible actualizar las horas del estudiante.',
    )
  }
}

/*
 * Agrega las horas acreditadas y registra la actividad en el
 * historial local del estudiante.
 *
 * El identificador estable impide acreditar dos veces la misma
 * actividad si localStorage llegara a conservar datos parciales.
 */
function acreditarHorasEstudianteSimulado({
  numeroCuenta,
  actividad,
}) {
  const estudiantes =
    leerEstudiantesSimulados()

  const indiceEstudiante =
    estudiantes.findIndex(
      (estudiante) =>
        prepararTexto(
          estudiante?.datosPersonales
            ?.numeroCuenta ??
            estudiante?.datosPersonales
              ?.num_cuenta ??
            estudiante?.num_cuenta,
        ) === numeroCuenta,
    )

  if (indiceEstudiante === -1) {
    throw new ActividadAdminError(
      'No se encontró el estudiante inscrito para acreditar sus horas.',
    )
  }

  const estudiante =
    estudiantes[indiceEstudiante]

  const datosBecario = {
    ...(estudiante.datosBecario ?? {}),
  }

  const actividadesRecientes =
    Array.isArray(
      estudiante.actividadesRecientes,
    )
      ? [...estudiante.actividadesRecientes]
      : []

  const idRegistro =
    `registro-asistencia-${actividad.id}`

  /*
   * Si el historial ya posee este identificador, no volvemos
   * a sumar las horas.
   */
  const actividadYaAcreditada =
    actividadesRecientes.some(
      (registro) =>
        prepararTexto(registro.id) ===
        idRegistro,
    )

  if (actividadYaAcreditada) {
    return estudiantes
  }

  const horasAcreditadas =
    normalizarNumeroNoNegativo(
      actividad.horasAcreditables,
    )

  const horasAcumuladasActuales =
    normalizarNumeroNoNegativo(
      datosBecario.horasAcumuladas ??
        datosBecario.horas_acumuladas,
    )

  const horasFaltantesActuales =
    normalizarNumeroNoNegativo(
      datosBecario.horasFaltantes ??
        datosBecario.horas_faltantes,
    )

  estudiantes[indiceEstudiante] = {
    ...estudiante,

    datosBecario: {
      ...datosBecario,

      horasAcumuladas:
        horasAcumuladasActuales +
        horasAcreditadas,

      horasFaltantes:
        Math.max(
          0,
          horasFaltantesActuales -
            horasAcreditadas,
        ),
    },

    actividadesRecientes: [
      {
        id: idRegistro,
        fecha: actividad.fecha,
        titulo: actividad.titulo,
        horasAcreditadas,
        registradoPor:
          'Panel administrativo',
      },

      ...actividadesRecientes,
    ],

    actualizadoEn:
      new Date().toISOString(),
  }

  return estudiantes
}

/*VALIDACIÓN DE FORMULARIOS DE ACTIVIDAD */
function prepararEntero(
  valor,
  nombreCampo,
  minimo,
  maximo = null,
) {
  const numero = Number(valor)

  if (!Number.isInteger(numero)) {
    throw new ActividadAdminError(
      `${nombreCampo} debe ser un número entero.`,
    )
  }

  if (numero < minimo) {
    throw new ActividadAdminError(
      `${nombreCampo} debe ser mayor o igual a ${minimo}.`,
    )
  }

  if (
    maximo !== null &&
    numero > maximo
  ) {
    throw new ActividadAdminError(
      `${nombreCampo} debe ser menor o igual a ${maximo}.`,
    )
  }

  return numero
}

/*
 * Comprueba el formato YYYY-MM-DD, la existencia real de la
 * fecha y que no sea anterior al día actual.
 */
function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new ActividadAdminError(
      'La fecha de la actividad no es válida.',
    )
  }

  const [
    anio,
    mes,
    dia,
  ] = fecha.split('-').map(Number)

  const fechaLocal = new Date(
    anio,
    mes - 1,
    dia,
  )

  const fechaValida =
    fechaLocal.getFullYear() === anio &&
    fechaLocal.getMonth() === mes - 1 &&
    fechaLocal.getDate() === dia

  if (!fechaValida) {
    throw new ActividadAdminError(
      'La fecha de la actividad no existe.',
    )
  }

  const fechaActual = new Date()
  fechaActual.setHours(0, 0, 0, 0)

  if (fechaLocal < fechaActual) {
    throw new ActividadAdminError(
      'La fecha no puede ser anterior al día de hoy.',
    )
  }

  return fecha
}

// Comprueba que la hora utilice el formato de 24 horas HH:mm.
function validarHora(
  hora,
  nombreCampo,
) {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
  ) {
    throw new ActividadAdminError(
      `${nombreCampo} no tiene un formato válido.`,
    )
  }

  return hora
}

function validarEstado(estado) {
  const estadoNormalizado =
    normalizarEstadoActividad(estado)

  if (
    !ESTADOS_PERMITIDOS.includes(
      estadoNormalizado,
    )
  ) {
    throw new ActividadAdminError(
      'El estado de la actividad no es válido.',
    )
  }

  return estadoNormalizado
}

/*
 * Valida y normaliza todos los datos necesarios para crear
 * o actualizar una actividad.
 */
function prepararDatosActividad(
  datos,
  estadoPredeterminado = 'programada',
) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new ActividadAdminError(
      'La información de la actividad no es válida.',
    )
  }

  const titulo =
    prepararTexto(datos.titulo)

  const descripcion =
    prepararTexto(datos.descripcion)

  const lugar =
    prepararTexto(datos.lugar)

  if (!titulo) {
    throw new ActividadAdminError(
      'El título de la actividad es obligatorio.',
    )
  }

  if (titulo.length > 120) {
    throw new ActividadAdminError(
      'El título no puede superar los 120 caracteres.',
    )
  }

  if (!descripcion) {
    throw new ActividadAdminError(
      'La descripción de la actividad es obligatoria.',
    )
  }

  if (descripcion.length > 500) {
    throw new ActividadAdminError(
      'La descripción no puede superar los 500 caracteres.',
    )
  }

  if (!lugar) {
    throw new ActividadAdminError(
      'El lugar de la actividad es obligatorio.',
    )
  }

  const fecha =
    validarFecha(
      prepararTexto(datos.fecha),
    )

  const horaInicio =
    validarHora(
      prepararTexto(
        datos.horaInicio,
      ),
      'La hora de inicio',
    )

  const horaFinalizacion =
    validarHora(
      prepararTexto(
        datos.horaFinalizacion,
      ),
      'La hora de finalización',
    )

  if (
    horaFinalizacion <= horaInicio
  ) {
    throw new ActividadAdminError(
      'La hora de finalización debe ser posterior a la hora de inicio.',
    )
  }

  /*
   * Compatibilidad con el formulario actual:
   *
   * Mientras el formulario siga enviando cuposDisponibles,
   * ese valor se interpreta también como capacidad total al
   * crear una actividad.
   */
  const cuposTotales =
    prepararEntero(
      datos.cuposTotales ??
        datos.cuposDisponibles,
      'Los cupos totales',
      1,
    )

  const cuposDisponibles =
    prepararEntero(
      datos.cuposDisponibles ??
        cuposTotales,
      'Los cupos disponibles',
      0,
    )

  if (
    cuposDisponibles >
    cuposTotales
  ) {
    throw new ActividadAdminError(
      'Los cupos disponibles no pueden superar los cupos totales.',
    )
  }

  const horasAcreditables =
    prepararEntero(
      datos.horasAcreditables,
      'Las horas acreditables',
      1,
      100,
    )

  return {
    titulo,
    descripcion,
    fecha,
    horaInicio,
    horaFinalizacion,
    lugar,
    cuposTotales,
    cuposDisponibles,
    horasAcreditables,

    estado:
      validarEstado(
        datos.estado ??
          estadoPredeterminado,
      ),
  }
}

/*
 * Mantiene compatibilidad con el formulario anterior, donde
 * cuposDisponibles representaba realmente la capacidad total.
 */
function prepararCambiosCompatibles(
  cambios,
) {
  if (
    !cambios ||
    typeof cambios !== 'object' ||
    Array.isArray(cambios)
  ) {
    return cambios
  }

  const cambiosPreparados = {
    ...cambios,
  }

  const contieneCuposDisponibles =
    Object.prototype.hasOwnProperty.call(
      cambios,
      'cuposDisponibles',
    )

  const contieneCuposTotales =
    Object.prototype.hasOwnProperty.call(
      cambios,
      'cuposTotales',
    )

  if (
    contieneCuposDisponibles &&
    !contieneCuposTotales
  ) {
    cambiosPreparados.cuposTotales =
      cambios.cuposDisponibles
  }

  return cambiosPreparados
}

/*
 * CrearActividadInput y la actualización del backend reciben
 * la capacidad total mediante la propiedad cupos.
 */
function convertirActividadParaBackend(
  actividad,
) {
  return {
    titulo: actividad.titulo,
    descripcion: actividad.descripcion,
    ubicacion: actividad.lugar,
    fecha_actividad: actividad.fecha,

    horas_asignar:
      actividad.horasAcreditables,

    hora_inicio:
      actividad.horaInicio,

    hora_final:
      actividad.horaFinalizacion,

    cupos:
      actividad.cuposTotales,
  }
}

function ordenarActividades(
  actividades,
) {
  return [...actividades].sort(
    (actividadA, actividadB) => {
      const fechaHoraA =
        `${actividadA.fecha}T` +
        `${actividadA.horaInicio}`

      const fechaHoraB =
        `${actividadB.fecha}T` +
        `${actividadB.horaInicio}`

      return fechaHoraA.localeCompare(
        fechaHoraB,
      )
    },
  )
}

/* FUNCIONES PÚBLICAS DE CONSULTA */
export async function listarActividades() {
  const ahora = new Date()

  if (usarDatosAdminSimulados) {
    const actividades =
      leerActividades()
        .filter(
          (actividad) =>
            actividad.eliminada !==
            true,
        )
        .map((actividad) =>
          aplicarEstadoTemporalActividad(
            actividad,
            ahora,
          ),
        )

    return clonarDatos(
      ordenarActividades(
        actividades,
      ),
    )
  }

  const respuesta =
    await peticionApi(
      '/actividades',
    )

  if (!Array.isArray(respuesta)) {
    throw new ActividadAdminError(
      'El servidor no devolvió una lista válida de actividades.',
    )
  }

  const actividades =
    respuesta
      .map(
        normalizarActividadBackend,
      )
      .map((actividad) =>
        aplicarEstadoTemporalActividad(
          actividad,
          ahora,
        ),
      )

  return ordenarActividades(
    actividades,
  )
}

export async function obtenerActividad(
  identificador,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  if (!usarDatosAdminSimulados) {
    const actividades =
      await listarActividades()

    return (
      actividades.find(
        (actividad) =>
          prepararTexto(
            actividad.id,
          ) === id,
      ) ?? null
    )
  }

  const actividad =
    leerActividades().find(
      (elemento) =>
        elemento.id === id &&
        elemento.eliminada !== true,
    )

    return actividad
    ? clonarDatos(
      aplicarEstadoTemporalActividad(
        actividad,
      ),
    )
    : null
}

/*
 * Obtiene las inscripciones y marcaciones de una actividad.
 *
 * API:
 * GET /asistencias/actividades/{actividad_id}
 *
 * Mock:
 * colección persistida en localStorage.
 */
export async function listarAsistenciasActividad(
  identificador,
) {
  const actividadId =
    prepararTexto(identificador)

  if (!actividadId) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  if (usarDatosAdminSimulados) {
    const asistenciasAdministrativas = leerAsistencias()
    const inscripcionesEstudiante = leerInscripcionesEstudianteSimuladas() ?? []

    const asistencias =
      unificarAsistenciasSimuladas([
        ...asistenciasAdministrativas,
        ...inscripcionesEstudiante,
      ]).filter(
        (asistencia) =>
          asistencia.actividadId === actividadId,
      )

      return clonarDatos(
        asistencias,
      )
  }

  const respuesta =
    await peticionApi(
      `/asistencias/actividades/${encodeURIComponent(
        actividadId,
      )}`,
    )

  if (!Array.isArray(respuesta)) {
    throw new ActividadAdminError(
      'El servidor no devolvió una lista válida de asistencias.',
    )
  }

  return respuesta.map(
    (asistencia) =>
      normalizarAsistencia(
        asistencia,
        actividadId,
      ),
  )
}

/*
 * Devuelve el historial de actividades correspondiente
 * a un estudiante específico.
 */
export async function listarHistorialActividadesPorEstudiante(
  numeroCuenta,
) {
  const cuenta =
    prepararTexto(numeroCuenta)

  if (!/^\d{11}$/.test(cuenta)) {
    throw new ActividadAdminError(
      'El número de cuenta del estudiante no es válido.',
    )
  }

  if (!usarDatosAdminSimulados) {
    throw new ActividadAdminError(
      'El backend todavía no permite consultar el historial de actividades por estudiante.',
    )
  }

  /*
   * Creamos un índice para localizar rápidamente
   * la información de cada actividad.
   */
  const actividades =
    leerActividades()

  const actividadesPorId =
    new Map(
      actividades.map(
        (actividad) => [
          prepararTexto(actividad.id),
          actividad,
        ],
      ),
    )

  /*
   * Asistencias registradas desde el módulo
   * administrativo de actividades.
   */
  const registrosAdministrativos =
    leerAsistencias()
      .filter(
        (asistencia) =>
          asistencia.numeroCuenta ===
          cuenta,
      )
      .map((asistencia) =>
        construirRegistroHistorialEstudiante(
          asistencia,

          actividadesPorId.get(
            asistencia.actividadId,
          ),
        ),
      )

  /*
   * Si el portal estudiantil todavía no ha creado
   * su localStorage, utilizamos el mock inicial.
   */
  const inscripcionesGuardadas =
    leerInscripcionesEstudianteSimuladas()

  const inscripcionesEstudiante =
    Array.isArray(
      inscripcionesGuardadas,
    )
      ? inscripcionesGuardadas
      : clonarDatos(
          inscripcionesEstudianteMock,
        )

  const registrosPortal =
    inscripcionesEstudiante
      .map((inscripcion) => {
        const cuentaInscripcion =
          prepararTexto(
            inscripcion.numeroCuenta ??
              inscripcion.num_cuenta,
          )

        if (
          cuentaInscripcion !== cuenta
        ) {
          return null
        }

        const actividadId =
          prepararTexto(
            inscripcion.actividadId ??
              inscripcion.actividad_id ??
              inscripcion.actividad?.id,
          )

        if (!actividadId) {
          return null
        }

        const asistencia =
          normalizarAsistencia(
            {
              id: inscripcion.id,
              actividadId,
              numeroCuenta: cuenta,

              checkIn:
                inscripcion
                  .entradaRegistrada ??
                inscripcion.checkIn ??
                inscripcion.check_in,

              checkOut:
                inscripcion
                  .salidaRegistrada ??
                inscripcion.checkOut ??
                inscripcion.check_out,

              horasRegistradas:
                inscripcion
                  .horasRegistradas ??
                inscripcion
                  .horas_registradas,

              estado:
                inscripcion
                  .estadoAsistencia ??
                inscripcion.estado,
            },

            actividadId,
          )

        const actividad =
          inscripcion.actividad ??
          actividadesPorId.get(
            actividadId,
          )

        return construirRegistroHistorialEstudiante(
          asistencia,
          actividad,
        )
      })
      .filter(Boolean)

  /*
   * Una misma asistencia puede encontrarse en ambas
   * colecciones. El identificador de la actividad evita
   * mostrarla dos veces.
   */
  const registrosPorActividad =
    new Map()

  for (
    const registro of [
      ...registrosAdministrativos,
      ...registrosPortal,
    ]
  ) {
    registrosPorActividad.set(
      registro.actividadId,
      registro,
    )
  }

  /*
   * El historial se entrega desde la actividad
   * más reciente hacia la más antigua.
   */
  const historial =
    [
      ...registrosPorActividad.values(),
    ].sort((registroA, registroB) => {
      const comparacionFecha =
        registroB.fecha.localeCompare(
          registroA.fecha,
        )

      if (comparacionFecha !== 0) {
        return comparacionFecha
      }

      return registroB.id.localeCompare(
        registroA.id,
      )
    })

  return clonarDatos(historial)
}

/* CREACIÓN, ACTUALIZACIÓN Y ELIMINACIÓN */
export async function crearActividad(
  datos,
) {
  const datosPreparados =
    prepararDatosActividad(
      {
        ...datos,
        estado: 'programada',
      },
      'programada',
    )

  if (!usarDatosAdminSimulados) {
    const actividadCreada =
      await peticionApi(
        '/actividades',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            convertirActividadParaBackend(
              datosPreparados,
            ),
          ),
        },
      )

    return normalizarActividadBackend(
      actividadCreada,
    )
  }

  const fechaActual =
    new Date().toISOString()

  const nuevaActividad = {
    id: crearIdentificador(),
    ...datosPreparados,

    estado: 'programada',
    activa: true,
    eliminada: false,

    entradaHabilitada: false,
    entradaHabilitadaEn: null,
    entradaHabilitadaHasta: null,
    tokenEntradaSimulado: null,

    salidaHabilitada: false,
    salidaHabilitadaEn: null,
    salidaHabilitadaHasta: null,
    tokenSalidaSimulado: null,

    desactivadaEn: null,
    eliminadaEn: null,

    creadaEn: fechaActual,
    actualizadaEn: fechaActual,
  }

  const actividades =
    leerActividades()

  actividades.push(
    nuevaActividad,
  )

  guardarActividades(
    actividades,
  )

  return clonarDatos(
    nuevaActividad,
  )
}

export async function actualizarActividad(
  identificador,
  cambios,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const cambiosPreparados =
    prepararCambiosCompatibles(
      cambios,
    )

  if (!usarDatosAdminSimulados) {
    /*
     * El PUT del backend requiere el objeto completo.
     * Primero recuperamos la actividad y después aplicamos
     * únicamente los cambios recibidos.
     */
    const actividadActual =
      await obtenerActividad(id)

    if (!actividadActual) {
      throw new ActividadAdminError(
        'La actividad que deseas actualizar no existe.',
      )
    }

    const datosPreparados =
      prepararDatosActividad({
        ...actividadActual,
        ...cambiosPreparados,
      })

    const inscritosActuales =
      Math.max(
        0,
        actividadActual.cuposTotales -
          actividadActual.cuposDisponibles,
      )

    if (
      datosPreparados.cuposTotales <
      inscritosActuales
    ) {
      throw new ActividadAdminError(
        'Los cupos totales no pueden ser menores que la cantidad de estudiantes inscritos.',
      )
    }

    const actividadActualizada =
      await peticionApi(
        `/actividades/${encodeURIComponent(
          id,
        )}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(
            convertirActividadParaBackend(
              datosPreparados,
            ),
          ),
        },
      )

    return normalizarActividadBackend(
      actividadActualizada,
    )
  }

  const actividades =
    leerActividades()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id &&
        actividad.eliminada !== true,
    )

  if (indiceActividad === -1) {
    throw new ActividadAdminError(
      'La actividad que deseas actualizar no existe.',
    )
  }

  const actividadActual =
    actividades[indiceActividad]

  const datosPreparados =
    prepararDatosActividad({
      ...actividadActual,
      ...cambiosPreparados,
    })

  /*
   * En el mock calculamos nuevamente los espacios restantes
   * usando las inscripciones almacenadas.
   */
  const estudiantesInscritos =
    leerAsistencias().filter(
      (asistencia) =>
        asistencia.actividadId === id,
    ).length

  if (
    datosPreparados.cuposTotales <
    estudiantesInscritos
  ) {
    throw new ActividadAdminError(
      'Los cupos totales no pueden ser menores que la cantidad de estudiantes inscritos.',
    )
  }

  const actividadActualizada = {
    ...actividadActual,
    ...datosPreparados,

    cuposDisponibles:
      datosPreparados.cuposTotales -
      estudiantesInscritos,

    id: actividadActual.id,

    creadaEn:
      actividadActual.creadaEn,

    actualizadaEn:
      new Date().toISOString(),
  }

  actividades[indiceActividad] =
    actividadActualizada

  guardarActividades(
    actividades,
  )

  return clonarDatos(
    actividadActualizada,
  )
}

/*
* Cambia la visibilidad de una actividad programada.
* 1. Desactivar conserva la actividad y todas sus inscripciones.
* 2. Reactivar permite que vuelva a mostrarse al estudiante.
*/
export async function cambiarVisibilidadActividad(
  identificador,
  activa,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  if (typeof activa !== 'boolean') {
    throw new ActividadAdminError(
      'La visibilidad solicitada no es válida.',
    )
  }

  /*
  * El backend todavia no posee el campo ni el endpoint.
  * Esta rama queda identificada para conectarla más adelante.
  */
 if (!usarDatosAdminSimulados) {
  throw new ActividadAdminError(
    'El backend actual todavía no permite activar o desactivar actividades.',
  )
 }

 const actividades = leerActividades()

 const indiceActividad =
  actividades.findIndex(
    (actividad) =>
      actividad.id === id &&
      actividad.eliminada !== true,
  )

  if (indiceActividad === -1) {
    throw new ActividadAdminError(
      'La actividad que deseas actualizar no existe.',
    )
  }

  const actividadActual = actividades[indiceActividad]
  if (
    normalizarEstadoActividad(
      actividadActual.estado,
    ) !== 'programada'
  ) {
    throw new ActividadAdminError(
      'Solamente puedes activar o desactivar actividades programadas.',
    )
  }

  /*
  * Si la actividad ya posee el valor solicitado,
  * evitamos realizar una escritura innecesaria.
  */
 if (
  actividadActual.activa ===
  activa
 ) {
  return clonarDatos(
    actividadActual,
  )
 }

 const fechaActual =
  new Date().toISOString()

const actividadActualizada = {
  ...actividadActual,
  activa,
  desactivadaEn:
    activa
      ? null
      : fechaActual,
  actualizadaEn: fechaActual,
}

actividades[indiceActividad] = actividadActualizada
guardarActividades(
  actividades,
)

return clonarDatos(
  actividadActualizada,
)
}

/*
* Elimina permanentemente una actividad.
* En modo simulado tambien elimina sus inscripciones y asistencias.
* Las cuentas de estudiantes no se modifican.
* En modo API utiliza DELETE /actividades/{id}.
*/
export async function eliminarActividad(
  identificador,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  /*
   * En API verificamos primero que la actividad todavía
   * pertenezca al grupo de actividades programadas.
   */
  if (!usarDatosAdminSimulados) {
    const actividadActual =
      await obtenerActividad(id)

    if (!actividadActual) {
      throw new ActividadAdminError(
        'La actividad que deseas eliminar no existe.',
      )
    }

    if (
      normalizarEstadoActividad(
        actividadActual.estado,
      ) !== 'programada'
    ) {
      throw new ActividadAdminError(
        'Solamente puedes eliminar actividades programadas.',
      )
    }

    /*
     * El backend se encargará posteriormente de eliminar
     * también las relaciones asociadas a la actividad.
     */
    return peticionApi(
      `/actividades/${encodeURIComponent(
        id,
      )}`,
      {
        method: 'DELETE',
      },
    )
  }

  const actividades =
    leerActividades()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id &&
        actividad.eliminada !== true,
    )

  if (indiceActividad === -1) {
    throw new ActividadAdminError(
      'La actividad que deseas eliminar no existe.',
    )
  }

  const actividadEliminada =
    actividades[indiceActividad]

  if (
    normalizarEstadoActividad(
      actividadEliminada.estado,
    ) !== 'programada'
  ) {
    throw new ActividadAdminError(
      'Solamente puedes eliminar actividades programadas.',
    )
  }

  /*
   * Eliminamos físicamente la actividad de la colección
   * administrativa del modo simulado.
   */
  const actividadesRestantes =
    actividades.filter(
      (actividad) =>
        actividad.id !== id,
    )

  /*
   * Las asistencias administrativas pertenecientes a la
   * actividad también dejan de existir.
   */
  const asistenciasRestantes =
    leerAsistencias().filter(
      (asistencia) =>
        prepararTexto(
          asistencia.actividadId,
        ) !== id,
    )

  const inscripcionesEstudiante =
    leerInscripcionesEstudianteSimuladas()

  /*
   * Una inscripción puede utilizar camelCase, snake_case
   * o conservar una copia interna de la actividad.
   */
  const inscripcionesRestantes =
    inscripcionesEstudiante?.filter(
      (inscripcion) => {
        const actividadInscripcion =
          prepararTexto(
            inscripcion.actividadId ??
              inscripcion.actividad_id ??
              inscripcion.actividad?.id,
          )

        return (
          actividadInscripcion !== id
        )
      },
    ) ?? null

  guardarActividades(
    actividadesRestantes,
  )

  guardarAsistencias(
    asistenciasRestantes,
  )

  if (
    inscripcionesRestantes !== null
  ) {
    guardarInscripcionesEstudianteSimuladas(
      inscripcionesRestantes,
    )
  }

  /*
   * No llamamos a guardarEstudiantesSimulados.
   * Las cuentas permanecen completamente intactas.
   */
  return clonarDatos({
    ...actividadEliminada,

    activa: false,
    eliminada: true,

    eliminadaEn:
      new Date().toISOString(),
  })
}

/*
 * Recupera en una sola operación los elementos necesarios
 * para una marcación manual simulada.
 *
 * Se combinan las asistencias administrativas con las
 * inscripciones creadas desde el portal del estudiante.
 */
function obtenerContextoMarcacionSimulada({
  actividadId,
  numeroCuenta,
}) {
  const actividades =
    leerActividades()

  const actividad =
    actividades.find(
      (elemento) =>
        elemento.id === actividadId &&
        elemento.eliminada !== true,
    )

  if (!actividad) {
    throw new ActividadAdminError(
      'La actividad seleccionada no existe.',
    )
  }

  /*
   * El administrador y el estudiante utilizan colecciones
   * diferentes en localStorage. Las unificamos para que una
   * inscripción realizada por el estudiante pueda recibir
   * marcaciones manuales desde el panel administrativo.
   */
  const asistencias =
    unificarAsistenciasSimuladas([
      ...leerAsistencias(),
      ...(
        leerInscripcionesEstudianteSimuladas() ??
        []
      ),
    ])

  const indiceAsistencia =
    asistencias.findIndex(
      (asistencia) =>
        asistencia.actividadId ===
          actividadId &&
        asistencia.numeroCuenta ===
          numeroCuenta,
    )

  if (indiceAsistencia === -1) {
    throw new ActividadAdminError(
      'El estudiante no está inscrito en esta actividad.',
    )
  }

  return {
    actividad,
    asistencias,
    indiceAsistencia,
    asistencia:
      asistencias[indiceAsistencia],
  }
}

/*
 * Refleja una marcación manual en la inscripción almacenada
 * por el portal del estudiante.
 *
 * Si la asistencia pertenece solamente a los mocks
 * administrativos, la función no realiza ningún cambio.
 */
function actualizarInscripcionEstudianteSimulada({
  actividadId,
  numeroCuenta,
  tipo,
  horasRegistradas = null,
}) {
  const inscripciones =
    leerInscripcionesEstudianteSimuladas()

  if (!Array.isArray(inscripciones)) {
    return
  }

  const indiceInscripcion =
    inscripciones.findIndex(
      (inscripcion) => {
        const idActividad =
          prepararTexto(
            inscripcion.actividadId ??
              inscripcion.actividad_id ??
              inscripcion.actividad?.id,
          )

        const cuentaEstudiante =
          prepararTexto(
            inscripcion.numeroCuenta ??
              inscripcion.num_cuenta,
          )

        return (
          idActividad === actividadId &&
          cuentaEstudiante === numeroCuenta
        )
      },
    )

  /*
   * Algunas asistencias forman parte exclusivamente de los
   * datos administrativos iniciales y no tienen inscripción
   * dentro del portal del estudiante.
   */
  if (indiceInscripcion === -1) {
    return
  }

  const inscripcion =
    inscripciones[indiceInscripcion]

  const fechaMarcacion =
    new Date().toISOString()

  if (tipo === TIPOS_MARCACION.entrada) {
    inscripciones[indiceInscripcion] = {
      ...inscripcion,

      estadoInscripcion: 'inscrita',
      estadoAsistencia: 'Pendiente',

      entradaRegistrada: true,

      entradaRegistradaEn:
        inscripcion.entradaRegistradaEn ??
        inscripcion.entrada_registrada_en ??
        fechaMarcacion,

      actualizadaEn: fechaMarcacion,
    }
  } else {
    inscripciones[indiceInscripcion] = {
      ...inscripcion,

      estadoInscripcion: 'completada',
      estadoAsistencia: 'Asistió',

      salidaRegistrada: true,

      salidaRegistradaEn:
        inscripcion.salidaRegistradaEn ??
        inscripcion.salida_registrada_en ??
        fechaMarcacion,

      horasRegistradas:
        normalizarNumeroNoNegativo(
          horasRegistradas,
        ),

      actualizadaEn: fechaMarcacion,
    }
  }

  guardarInscripcionesEstudianteSimuladas(
    inscripciones,
  )
}

/*
 * Registra la entrada manual.
 *
 * API:
 * POST /asistencias/entrada/actividades/{actividad_id}/becario/{num_cuenta}
 */
export async function registrarEntradaManualActividad(
  identificador,
  numeroCuentaSolicitado,
) {
  const actividadId =
    prepararTexto(identificador)

  const numeroCuenta =
    prepararTexto(
      numeroCuentaSolicitado,
    )

  if (!actividadId) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  if (!numeroCuenta) {
    throw new ActividadAdminError(
      'El número de cuenta del estudiante es obligatorio.',
    )
  }

  if (!usarDatosAdminSimulados) {
    const respuesta =
      await peticionApi(
        `/asistencias/entrada/actividades/${encodeURIComponent(
          actividadId,
        )}/becario/${encodeURIComponent(
          numeroCuenta,
        )}`,
        {
          method: 'POST',
        },
      )

    return {
      mensaje:
        prepararTexto(
          respuesta?.mensaje,
        ) ||
        'La entrada fue registrada correctamente.',

      /*
       * El backend responde con un mensaje. La vista volverá
       * a consultar el listado para obtener el estado oficial.
       */
      asistencia: null,
    }
  }

  const {
    asistencias,
    indiceAsistencia,
    asistencia,
  } = obtenerContextoMarcacionSimulada({
    actividadId,
    numeroCuenta,
  })

  if (asistencia.checkIn) {
    throw new ActividadAdminError(
      'La entrada del estudiante ya fue registrada.',
    )
  }

  const asistenciaActualizada = {
    ...asistencia,
    checkIn: true,
    estado: 'Asistió',
  }

  asistencias[indiceAsistencia] =
    asistenciaActualizada

  guardarAsistencias(
    asistencias,
  )

  actualizarInscripcionEstudianteSimulada({
    actividadId,
    numeroCuenta,
    tipo: TIPOS_MARCACION.entrada,
  })

  return {
    mensaje:
      'La entrada fue registrada correctamente.',

    asistencia:
      clonarDatos(
        asistenciaActualizada,
      ),
  }
}

/*
 * Registra la salida manual.
 *
 * API:
 * POST /asistencias/salida/actividades/{actividad_id}/becario/{num_cuenta}
 *
 * Según el contrato actual, esta operación también acredita
 * automáticamente las horas asignadas a la actividad.
 */
export async function registrarSalidaManualActividad(
  identificador,
  numeroCuentaSolicitado,
) {
  const actividadId =
    prepararTexto(identificador)

  const numeroCuenta =
    prepararTexto(
      numeroCuentaSolicitado,
    )

  if (!actividadId) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  if (!numeroCuenta) {
    throw new ActividadAdminError(
      'El número de cuenta del estudiante es obligatorio.',
    )
  }

  if (!usarDatosAdminSimulados) {
    const respuesta =
      await peticionApi(
        `/asistencias/salida/actividades/${encodeURIComponent(
          actividadId,
        )}/becario/${encodeURIComponent(
          numeroCuenta,
        )}`,
        {
          method: 'POST',
        },
      )

    return {
      mensaje:
        prepararTexto(
          respuesta?.mensaje,
        ) ||
        'La salida y las horas fueron registradas correctamente.',

      asistencia: null,
    }
  }

  const {
    actividad,
    asistencias,
    indiceAsistencia,
    asistencia,
  } = obtenerContextoMarcacionSimulada({
    actividadId,
    numeroCuenta,
  })

  if (!asistencia.checkIn) {
    throw new ActividadAdminError(
      'Debes registrar la entrada antes de marcar la salida.',
    )
  }

  if (asistencia.checkOut) {
    throw new ActividadAdminError(
      'La salida del estudiante ya fue registrada.',
    )
  }

  const asistenciaActualizada = {
    ...asistencia,
    checkOut: true,

    horasRegistradas:
      actividad.horasAcreditables,

    estado: 'Asistió',
  }

  /*
   * Primero preparamos la actualización del estudiante.
   * Después persistimos ambos cambios del escenario simulado.
   */
  const estudiantesActualizados =
    acreditarHorasEstudianteSimulado({
      numeroCuenta,
      actividad,
    })

  asistencias[indiceAsistencia] =
    asistenciaActualizada

  guardarEstudiantesSimulados(
    estudiantesActualizados,
  )

  guardarAsistencias(
    asistencias,
  )

  actualizarInscripcionEstudianteSimulada({
    actividadId,
    numeroCuenta,
    tipo: TIPOS_MARCACION.salida,

    horasRegistradas: actividad.horasAcreditables,
  })

  return {
    mensaje:
      'La salida y las horas fueron registradas correctamente.',

    asistencia:
      clonarDatos(
        asistenciaActualizada,
      ),
  }
}

/* GENERACIÓN DE CÓDIGOS QR */

/*
 * Construye una fecha local usando los valores de la actividad.
 * Evitamos Date.parse para impedir cambios por zona horaria.
 */
function crearFechaHoraLocalActividad(
  fecha,
  hora,
) {
  const fechaPreparada =
    prepararTexto(fecha)

  const horaPreparada =
    prepararTexto(hora)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fechaPreparada,
    ) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      horaPreparada,
    )
  ) {
    return null
  }

  const [anio, mes, dia] =
    fechaPreparada
      .split('-')
      .map(Number)

  const [horas, minutos] =
    horaPreparada
      .split(':')
      .map(Number)

  const fechaHora = new Date(
    anio,
    mes - 1,
    dia,
    horas,
    minutos,
    0,
    0,
  )

  const fechaHoraValida =
    fechaHora.getFullYear() === anio &&
    fechaHora.getMonth() === mes - 1 &&
    fechaHora.getDate() === dia &&
    fechaHora.getHours() === horas &&
    fechaHora.getMinutes() === minutos

  return fechaHoraValida
    ? fechaHora
    : null
}

/*
 * Obtiene las horas de inicio y finalización
 * utilizando fechas locales.
 */
function obtenerHorarioActividad(
  actividad,
) {
  return {
    inicio:
      crearFechaHoraLocalActividad(
        actividad?.fecha,
        actividad?.horaInicio,
      ),

    finalizacion:
      crearFechaHoraLocalActividad(
        actividad?.fecha,
        actividad?.horaFinalizacion,
      ),
  }
}

/*
 * Construye la ventana automática de veinte minutos.
 *
 * Entrada: comienza a la hora de inicio.
 * Salida: comienza a la hora de finalización.
 */
function obtenerVentanaQrActividad(
  actividad,
  tipo,
) {
  const duracionMinutos =
    DURACION_QR_MINUTOS[tipo]

  if (!duracionMinutos) {
    throw new ActividadAdminError(
      'El tipo de marcación solicitado no es válido.',
    )
  }

  const {
    inicio,
    finalizacion,
  } = obtenerHorarioActividad(
    actividad,
  )

  if (!inicio || !finalizacion) {
    throw new ActividadAdminError(
      'No fue posible comprobar el horario de la actividad.',
    )
  }

  const comienzaEn =
    tipo === TIPOS_MARCACION.entrada
      ? inicio
      : finalizacion

  const expiraEn = new Date(
    comienzaEn.getTime() +
      duracionMinutos * 60 * 1000,
  )

  return {
    comienzaEn,
    expiraEn,
    duracionMinutos,
  }
}

/*
 * Comprueba que la solicitud se realice dentro
 * de la ventana correspondiente.
 */
function validarDisponibilidadQrActividad({
  actividad,
  tipo,
  ahora,
}) {
  if (actividad?.activa === false) {
    throw new ActividadAdminError(
      'No puedes generar el QR de una actividad desactivada.',
    )
  }

  const estado =
    normalizarEstadoActividad(
      actividad?.estado,
    )

  if (estado === 'cancelada') {
    throw new ActividadAdminError(
      'No puedes generar el QR de una actividad cancelada.',
    )
  }

  const ventana =
    obtenerVentanaQrActividad(
      actividad,
      tipo,
    )

  if (
    ahora.getTime() <
    ventana.comienzaEn.getTime()
  ) {
    throw new ActividadAdminError(
      tipo === TIPOS_MARCACION.entrada
        ? 'El QR de entrada estará disponible cuando comience la actividad.'
        : 'El QR de salida estará disponible cuando finalice la actividad.',
    )
  }

  if (
    ahora.getTime() >=
    ventana.expiraEn.getTime()
  ) {
    throw new ActividadAdminError(
      tipo === TIPOS_MARCACION.entrada
        ? 'La ventana de veinte minutos para registrar entradas ya finalizó.'
        : 'La ventana de veinte minutos para registrar salidas ya finalizó.',
    )
  }

  return ventana
}

/*
 * Genera un identificador único para impedir que dos
 * códigos simulados compartan exactamente el mismo token.
 */
function crearIdentificadorTokenQr() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID()
  }

  return (
    `${Date.now()}-` +
    Math.random().toString(16).slice(2)
  )
}

/*
 * Convierte el contenido del token a Base64 URL y agrega
 * un prefijo reconocido por el portal del estudiante.
 */
function codificarTokenQrSimulado(
  contenido,
) {
  if (
    typeof TextEncoder === 'undefined' ||
    typeof btoa !== 'function'
  ) {
    throw new ActividadAdminError(
      'El navegador no permite generar el código QR simulado.',
    )
  }

  const bytes =
    new TextEncoder().encode(
      JSON.stringify(contenido),
    )

  let contenidoBinario = ''

  for (const byte of bytes) {
    contenidoBinario +=
      String.fromCharCode(byte)
  }

  const base64Url =
    btoa(contenidoBinario)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return (
    PREFIJO_TOKEN_QR_SIMULADO +
    base64Url
  )
}

/*
 * Construye la dirección que abrirá el estudiante
 * al escanear el QR simulado.
 */
function crearUrlAsistenciaSimulada(
  tipo,
  token,
) {
  if (
    typeof window === 'undefined' ||
    !window.location?.origin
  ) {
    throw new ActividadAdminError(
      'No fue posible construir el enlace del código QR.',
    )
  }

  const url = new URL(
    `/asistencia/${tipo}`,
    window.location.origin,
  )

  url.searchParams.set(
    'token',
    token,
  )

  return url.toString()
}

/*
 * Genera un QR local respetando la misma ventana
 * utilizada por el backend.
 */
function crearQrSimulado({
  actividadId,
  tipo,
  ahora,
  ventana,
}) {
  const habilitadaEn =
    ahora.toISOString()

  const expiraEn =
    ventana.expiraEn.toISOString()

  const token =
    codificarTokenQrSimulado({
      version: 1,
      actividadId,
      tipo,
      habilitadaEn,
      expiraEn,

      nonce:
        crearIdentificadorTokenQr(),
    })

  return {
    tipo,
    token,

    url:
      crearUrlAsistenciaSimulada(
        tipo,
        token,
      ),

    // El mock genera el dibujo desde la URL.
    imagenUrl: null,

    habilitadaEn,
    expiraEn,

    duracionMinutos:
      ventana.duracionMinutos,
  }
}

/*
 * Convierte el archivo PNG recibido desde la API
 * en una dirección temporal que pueda utilizar <img>.
 */
function crearUrlImagenQr(
  imagen,
) {
  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !==
      'function'
  ) {
    throw new ActividadAdminError(
      'El navegador no permite mostrar la imagen del código QR.',
    )
  }

  return URL.createObjectURL(
    imagen,
  )
}

/*
 * Solicita un QR de entrada o salida.
 *
 * API:
 * POST /asistencias/entrada/actividades/{actividad_id}
 * POST /asistencias/salida/actividades/{actividad_id}
 *
 * Simulación:
 * genera un token local y reemplaza cualquier token anterior.
 */
async function generarQrActividad(
  identificador,
  tipoSolicitado,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const tipo =
    prepararTexto(
      tipoSolicitado,
    ).toLowerCase()

  if (
    !Object.values(
      TIPOS_MARCACION,
    ).includes(tipo)
  ) {
    throw new ActividadAdminError(
      'El tipo de marcación solicitado no es válido.',
    )
  }

  const ahora = new Date()

  /*
   * En modo API obtenemos la actividad actual para validar
   * el horario antes de solicitar la imagen al backend.
   */
  if (!usarDatosAdminSimulados) {
    const actividad =
      await obtenerActividad(id)

    if (!actividad) {
      throw new ActividadAdminError(
        'La actividad seleccionada no existe o ya no está disponible.',
      )
    }

    const ventana =
      validarDisponibilidadQrActividad({
        actividad,
        tipo,
        ahora,
      })

    const imagen =
      await peticionApiBlob(
        `/asistencias/${tipo}/actividades/${encodeURIComponent(
          id,
        )}`,
        {
          method: 'POST',
        },
      )

    return {
      actividad:
        aplicarEstadoTemporalActividad(
          actividad,
          ahora,
        ),

      qr: {
        tipo,

        /*
         * La API entrega el QR ya dibujado.
         * Por eso url permanece nula y utilizamos imagenUrl.
         */
        url: null,

        imagenUrl:
          crearUrlImagenQr(
            imagen,
          ),

        habilitadaEn:
          ahora.toISOString(),

        expiraEn:
          ventana.expiraEn.toISOString(),

        duracionMinutos:
          ventana.duracionMinutos,
      },
    }
  }

  /*
   * En modo simulado recuperamos la colección compartida
   * con el portal del estudiante.
   */
  const actividades =
    leerActividades()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id &&
        actividad.eliminada !== true,
    )

  if (indiceActividad === -1) {
    throw new ActividadAdminError(
      'La actividad seleccionada no existe.',
    )
  }

  const actividad =
    aplicarEstadoTemporalActividad(
      actividades[indiceActividad],
      ahora,
    )

  const ventana =
    validarDisponibilidadQrActividad({
      actividad,
      tipo,
      ahora,
    })

  const qr =
    crearQrSimulado({
      actividadId: id,
      tipo,
      ahora,
      ventana,
    })

  /*
   * Guardamos siempre el último token generado.
   * Esto invalida cualquier QR simulado anterior.
   */
  const camposMarcacion =
    tipo === TIPOS_MARCACION.entrada
      ? {
          entradaHabilitada: true,

          entradaHabilitadaEn:
            qr.habilitadaEn,

          entradaHabilitadaHasta:
            qr.expiraEn,

          tokenEntradaSimulado:
            qr.token,
        }
      : {
          salidaHabilitada: true,

          salidaHabilitadaEn:
            qr.habilitadaEn,

          salidaHabilitadaHasta:
            qr.expiraEn,

          tokenSalidaSimulado:
            qr.token,
        }

  const actividadActualizada = {
    ...actividad,
    ...camposMarcacion,

    actualizadaEn:
      ahora.toISOString(),
  }

  actividades[indiceActividad] =
    actividadActualizada

  guardarActividades(
    actividades,
  )

  return clonarDatos({
    actividad:
      actividadActualizada,

    qr,
  })
}

// Nombres definitivos de las operaciones.
export async function obtenerQrEntradaActividad(
  identificador,
) {
  return generarQrActividad(
    identificador,
    TIPOS_MARCACION.entrada,
  )
}

export async function obtenerQrSalidaActividad(
  identificador,
) {
  return generarQrActividad(
    identificador,
    TIPOS_MARCACION.salida,
  )
}

/* Restablecimiento del escenario simulado */
export async function restablecerActividades() {
  comprobarModoSimulado()

  const actividadesIniciales = obtenerActividadesIniciales()

  const asistenciasIniciales = obtenerAsistenciasIniciales()

  const estudiantesIniciales =
    clonarDatos(
      estudiantesAdminMock,
    )

  guardarActividades(
    actividadesIniciales,
  )

  guardarAsistencias(
    asistenciasIniciales,
  )

  guardarEstudiantesSimulados(
    estudiantesIniciales,
  )

  return clonarDatos(
    actividadesIniciales,
  )
}