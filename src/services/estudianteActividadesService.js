/*
 * Servicio de actividades del portal del estudiante.
 *
 * Durante el desarrollo utiliza datos simulados y localStorage.
 * Las funciones públicas son asincrónicas para conservar
 * la misma forma de consumo cuando se conecte el backend.
 */

import {
  adminPrincipalDashboardMock,
} from '../admin/principal/mocks/adminPrincipalMock.js'
import {
  inscripcionesEstudianteMock,
  NUMERO_CUENTA_ESTUDIANTE_PRUEBA,
} from '../mocks/estudianteActividadesMock.js'
import { apiFetch } from './api.js'
import {
  obtenerNumeroCuentaSesion,
} from './sesionService.js'

/*
 * Compartimos la misma clave utilizada por el servicio
 * administrativo para que el estudiante pueda ver inmediatamente
 * las actividades creadas por el administrador.
 */
const CLAVE_ACTIVIDADES_ADMIN =
  'asebep_admin_actividades_simuladas'

const CLAVE_INSCRIPCIONES_ESTUDIANTE =
  'asebep_estudiante_inscripciones_simuladas'

const ESTADOS_ACTIVIDAD_DISPONIBLE = [
  'programada',
  'en-curso',
]

const usarDatosSimulados =
  import.meta.env.DEV &&
  import.meta.env
    .VITE_USAR_DATOS_SIMULADOS === 'true'

export class EstudianteActividadesError
  extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name =
      'EstudianteActividadesError'
  }
}

/*
 * Convierte cualquier valor permitido en texto
 * y elimina espacios innecesarios.
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

/*
 * Convierte un valor en entero.
 * Si el dato no es válido, utiliza el valor predeterminado.
 */
function prepararEntero(
  valor,
  valorPredeterminado = null,
) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return valorPredeterminado
  }

  const numero = Number(valor)

  return Number.isInteger(numero)
    ? numero
    : valorPredeterminado
}

function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Genera identificadores para las inscripciones simuladas.
 * En la versión oficial, el identificador será creado
 * y devuelto directamente por el backend.
 */
function crearIdentificadorInscripcion() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return (
      `inscripcion-` +
      `${crypto.randomUUID()}`
    )
  }

  return (
    `inscripcion-${Date.now()}-` +
    Math.random().toString(16).slice(2)
  )
}

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
 * Obtiene la fecha local con formato YYYY-MM-DD.
 * No usamos toISOString porque podría cambiar el día
 * dependiendo de la zona horaria del navegador.
 */
function obtenerFechaHoy() {
  const fechaActual = new Date()

  const anio =
    fechaActual.getFullYear()

  const mes = String(
    fechaActual.getMonth() + 1,
  ).padStart(2, '0')

  const dia = String(
    fechaActual.getDate(),
  ).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function normalizarEstado(valor) {
  return prepararTexto(valor)
    .toLocaleLowerCase('es')
}

function obtenerCuposIniciales(
  identificador,
) {
  const actividadInicial =
    adminPrincipalDashboardMock
      .proximasActividades
      .find(
        (actividad) =>
          prepararTexto(actividad.id) ===
          identificador,
      )

  return prepararEntero(
    actividadInicial?.cuposTotales ??
      actividadInicial
        ?.cuposDisponibles,
    null,
  )
}

/*
 * Adapta tanto los datos simulados del frontend
 * como las posibles propiedades en snake_case de la API.
 *
 * La interfaz trabajará siempre con propiedades camelCase.
 */
function normalizarActividad(
  actividad,
) {
  if (
    !actividad ||
    typeof actividad !== 'object' ||
    Array.isArray(actividad)
  ) {
    return null
  }

  const id = prepararTexto(
    actividad.id ??
      actividad.id_actividad,
  )

  const cuposDisponibles =
    prepararEntero(
      actividad.cuposDisponibles ??
        actividad.cupos_disponibles ??
        actividad.cupos,
      null,
    )

  const cuposTotales =
    prepararEntero(
      actividad.cuposTotales ??
        actividad.cupos_totales,
      obtenerCuposIniciales(id) ??
        cuposDisponibles,
    )

  return {
    id,

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
        actividad.hora_inicio ??
        actividad.hora,
    ),

    horaFinalizacion: prepararTexto(
      actividad.horaFinalizacion ??
        actividad.hora_finalizacion ??
        actividad.hora_fin,
    ),

    lugar: prepararTexto(
      actividad.lugar ??
        actividad.ubicacion,
    ),

    cuposTotales,
    cuposDisponibles,

    horasAcreditables:
      prepararEntero(
        actividad.horasAcreditables ??
          actividad.horas_acreditables ??
          actividad.horas,
        0,
      ),

    estado:
      normalizarEstado(
        actividad.estado,
      ) || 'programada',

    activa:
      actividad.activa !== false,

    eliminada:
      actividad.eliminada === true,

    desactivadaEn:
      prepararTexto(
        actividad.desactivadaEn ??
          actividad.desactivada_en,
      ) || null,

    eliminadaEn:
      prepararTexto(
        actividad.eliminadaEn ??
          actividad.eliminada_en,
      ) || null,

    creadaEn:
      prepararTexto(
        actividad.creadaEn ??
          actividad.creada_en,
      ) || null,

    actualizadaEn:
      prepararTexto(
        actividad.actualizadaEn ??
          actividad.actualizada_en,
      ) || null,
  }
}

function normalizarInscripcion(
  inscripcion,
) {
  if (
    !inscripcion ||
    typeof inscripcion !== 'object' ||
    Array.isArray(inscripcion)
  ) {
    return null
  }

  const actividad =
    normalizarActividad(
      inscripcion.actividad,
    )

  return {
    id: prepararTexto(
      inscripcion.id ??
        inscripcion.id_inscripcion,
    ),

    actividadId: prepararTexto(
      inscripcion.actividadId ??
        inscripcion.actividad_id ??
        actividad?.id,
    ),

    numeroCuenta: prepararTexto(
      inscripcion.numeroCuenta ??
        inscripcion.num_cuenta,
    ),

    estadoInscripcion:
      normalizarEstado(
        inscripcion.estadoInscripcion ??
          inscripcion
            .estado_inscripcion,
      ) || 'inscrita',

    estadoAsistencia:
      prepararTexto(
        inscripcion.estadoAsistencia ??
          inscripcion
            .estado_asistencia,
      ) || 'Pendiente',

    horasRegistradas:
      prepararEntero(
        inscripcion.horasRegistradas ??
          inscripcion
            .horas_registradas,
        null,
      ),

    cupoDescontado:
      inscripcion.cupoDescontado ===
        true ||
      inscripcion.cupo_descontado ===
        true,

    creadaEn:
      prepararTexto(
        inscripcion.creadaEn ??
          inscripcion.creada_en,
      ) || null,

    actividad,
  }
}

function guardarColeccion(
  clave,
  datos,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteActividadesError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      clave,
      JSON.stringify(datos),
    )
  } catch {
    throw new EstudianteActividadesError(
      'No fue posible guardar las actividades del estudiante.',
    )
  }
}

function leerColeccion(
  clave,
  datosIniciales,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteActividadesError(
      'El almacenamiento local no está disponible.',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(clave)

    if (contenido === null) {
      const copiaInicial =
        clonarDatos(datosIniciales)

      guardarColeccion(
        clave,
        copiaInicial,
      )

      return copiaInicial
    }

    const datos = JSON.parse(contenido)

    if (!Array.isArray(datos)) {
      throw new Error()
    }

    return datos
  } catch (
    errorAlmacenamiento
  ) {
    if (
      errorAlmacenamiento instanceof
      EstudianteActividadesError
    ) {
      throw errorAlmacenamiento
    }

    throw new EstudianteActividadesError(
      'Los datos almacenados de las actividades no tienen un formato válido.',
    )
  }
}

function obtenerActividadesIniciales() {
  const actividades =
    adminPrincipalDashboardMock
      .proximasActividades

  if (!Array.isArray(actividades)) {
    return []
  }

  return actividades
    .map(normalizarActividad)
    .filter(
      (actividad) =>
        Boolean(actividad?.id),
    )
}

function leerActividadesSimuladas() {
  return leerColeccion(
    CLAVE_ACTIVIDADES_ADMIN,
    obtenerActividadesIniciales(),
  )
    .map(normalizarActividad)
    .filter(
      (actividad) =>
        Boolean(actividad?.id),
    )
}

function guardarActividadesSimuladas(
  actividades,
) {
  guardarColeccion(
    CLAVE_ACTIVIDADES_ADMIN,
    actividades,
  )
}

function leerInscripcionesSimuladas() {
  return leerColeccion(
    CLAVE_INSCRIPCIONES_ESTUDIANTE,
    inscripcionesEstudianteMock,
  )
    .map(normalizarInscripcion)
    .filter(
      (inscripcion) =>
        Boolean(
          inscripcion?.id &&
            inscripcion.actividadId,
        ),
    )
}

function guardarInscripcionesSimuladas(
  inscripciones,
) {
  guardarColeccion(
    CLAVE_INSCRIPCIONES_ESTUDIANTE,
    inscripciones,
  )
}

/*
 * Todas las operaciones se relacionan con la cuenta
 * contenida en la sesión. De esta forma, los componentes
 * no deben enviar manualmente el número de cuenta.
 */
function obtenerNumeroCuentaActual() {
  const numeroCuenta =
    prepararTexto(
      obtenerNumeroCuentaSesion(),
    )

  if (!numeroCuenta) {
    throw new EstudianteActividadesError(
      'No existe una sesión válida para consultar las actividades.',
    )
  }

  /*
   * Mientras trabajamos con mocks solamente existe
   * un estudiante de prueba autorizado.
   */
  if (
    usarDatosSimulados &&
    numeroCuenta !==
      NUMERO_CUENTA_ESTUDIANTE_PRUEBA
  ) {
    throw new EstudianteActividadesError(
      'La cuenta actual no corresponde al estudiante de prueba.',
    )
  }

  return numeroCuenta
}

function actividadEstaDisponible(
  actividad,
) {
  return (
    actividad.activa === true &&
    actividad.eliminada !== true &&
    ESTADOS_ACTIVIDAD_DISPONIBLE
      .includes(actividad.estado) &&
    actividad.fecha >=
      obtenerFechaHoy() &&
    Number.isInteger(
      actividad.cuposDisponibles,
    ) &&
    actividad.cuposDisponibles > 0
  )
}

function ordenarPorFechaAscendente(
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

function ordenarPorFechaDescendente(
  actividades,
) {
  return ordenarPorFechaAscendente(
    actividades,
  ).reverse()
}

function combinarInscripcionConActividad(
  inscripcion,
  actividadesPorId,
) {
  const actividadActual =
    actividadesPorId.get(
      inscripcion.actividadId,
    )

  const actividad =
    actividadActual ??
    inscripcion.actividad

  if (!actividad) {
    return null
  }

  return {
    ...actividad,
    inscripcionId: inscripcion.id,
    estadoInscripcion:
      inscripcion.estadoInscripcion,
    estadoAsistencia:
      inscripcion.estadoAsistencia,
    horasRegistradas:
      inscripcion.horasRegistradas,
    fechaInscripcion:
      inscripcion.creadaEn,
  }
}

/*
 * GET /actividades ya puede quedar aislado en este adaptador.
 * Cuando cambie el contrato del backend, solamente se ajustará
 * esta función y los componentes conservarán su estructura.
 */
async function listarActividadesDesdeApi() {
  const respuesta =
    await apiFetch('/actividades')

  const coleccion =
    Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(
            respuesta?.actividades,
          )
        ? respuesta.actividades
        : Array.isArray(
              respuesta?.data,
            )
          ? respuesta.data
          : null

  if (!coleccion) {
    throw new EstudianteActividadesError(
      'La API no devolvió una lista válida de actividades.',
    )
  }

  return coleccion
    .map(normalizarActividad)
    .filter(
      (actividad) =>
        Boolean(actividad?.id),
    )
}

/*
 * El backend todavía debe definir el contrato oficial
 * para inscribir, cancelar y consultar las inscripciones.
 *
 * No inventamos rutas provisionales: cuando el backend
 * publique esos endpoints, únicamente se reemplazarán
 * estas operaciones internas.
 */
function lanzarContratoApiPendiente() {
  throw new EstudianteActividadesError(
    'El backend todavía no tiene definido el contrato de inscripciones del estudiante.',
  )
}

export async function listarActividadesDisponibles() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    const actividades =
      await listarActividadesDesdeApi()

    return clonarDatos(
      ordenarPorFechaAscendente(
        actividades.filter(
          actividadEstaDisponible,
        ),
      ),
    )
  }

  const actividades =
    leerActividadesSimuladas()

  const inscripciones =
    leerInscripcionesSimuladas()
      .filter(
        (inscripcion) =>
          inscripcion.numeroCuenta ===
            numeroCuenta &&
          inscripcion
            .estadoInscripcion !==
            'cancelada',
      )

  const actividadesInscritas =
    new Set(
      inscripciones.map(
        (inscripcion) =>
          inscripcion.actividadId,
      ),
    )

  const disponibles =
    actividades.filter(
      (actividad) =>
        actividadEstaDisponible(
          actividad,
        ) &&
        !actividadesInscritas.has(
          actividad.id,
        ),
    )

  return clonarDatos(
    ordenarPorFechaAscendente(
      disponibles,
    ),
  )
}

export async function listarProximasActividadesInscritas() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const actividades =
    leerActividadesSimuladas()

  const actividadesPorId =
    new Map(
      actividades.map(
        (actividad) => [
          actividad.id,
          actividad,
        ],
      ),
    )

  const proximas =
    leerInscripcionesSimuladas()
      .filter(
        (inscripcion) =>
          inscripcion.numeroCuenta ===
            numeroCuenta &&
          inscripcion
            .estadoInscripcion !==
            'cancelada' &&
          normalizarEstado(
            inscripcion.estadoAsistencia,
          ) !== 'asistió',
      )
      .map(
        (inscripcion) =>
          combinarInscripcionConActividad(
            inscripcion,
            actividadesPorId,
          ),
      )
      .filter(
        (actividad) =>
          actividad &&
          actividad.fecha >=
            obtenerFechaHoy(),
      )

  return clonarDatos(
    ordenarPorFechaAscendente(
      proximas,
    ),
  )
}

export async function listarHistorialActividades() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const actividades =
    leerActividadesSimuladas()

  const actividadesPorId =
    new Map(
      actividades.map(
        (actividad) => [
          actividad.id,
          actividad,
        ],
      ),
    )

  /*
   * El historial muestra exclusivamente las actividades
   * cuya asistencia fue confirmada como "Asistió".
   */
  const historial =
    leerInscripcionesSimuladas()
      .filter(
        (inscripcion) =>
          inscripcion.numeroCuenta ===
            numeroCuenta &&
          normalizarEstado(
            inscripcion.estadoAsistencia,
          ) === 'asistió',
      )
      .map(
        (inscripcion) =>
          combinarInscripcionConActividad(
            inscripcion,
            actividadesPorId,
          ),
      )
      .filter(Boolean)

  return clonarDatos(
    ordenarPorFechaDescendente(
      historial,
    ),
  )
}

export async function obtenerActividadEstudiante(
  identificador,
) {
  const id = prepararTexto(identificador)

  if (!id) {
    throw new EstudianteActividadesError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const numeroCuenta = obtenerNumeroCuentaActual()

  /*
  * En produccion consultamos las actividades publicadas.
  * Los datos de inscripcion se integrarán cuando el backend publique
  * el contrato oficial correspondiente.
  */
 if (!usarDatosSimulados) {
  const actividades =
    await listarActividadesDesdeApi()

  const actividad = actividades.find(
    (elemento) =>
      elemento.id === id &&
      elemento.eliminada !== true,
  )

  if (!actividad) {
    return null
  }

  return clonarDatos({
    ...actividad,
    inscrito: false,
    inscripcionId: null,
    estadoInscripcion: null,
    estadoAsistencia: null,
    horasRegistradas: null,
    fechaInscripcion: null,
  })
 }

 const actividades = leerActividadesSimuladas()

 const inscripcion = leerInscripcionesSimuladas()
  .find(
    (elemento) => elemento.numeroCuenta ===
      numeroCuenta && elemento.actividadId === id &&
      elemento.estadoInscripcion !== 'cancelada',
  )

  /*
  * Primero buscamos la version actual de la actividad.
  * Si ya no esta publicada, utilizamos la copia guardada
  * en la inscripcion para conservar accesible el historial. 
  */
 const actividadActual = actividades.find(
  (elemento) => elemento.id === id &&
    elemento.eliminada !== true,
 )

 const actividad = actividadActual ?? inscripcion?.actividad ?? null

 if (!actividad) {
  return null
 }

 // El detalle recibe en un solo objeto tanto la actividad como el estado particular del estudiante autenticado.
  return clonarDatos({
    ...actividad,
    inscrito: Boolean(inscripcion),
    inscripcionId:
      inscripcion?.id ?? null,
    estadoInscripcion:
      inscripcion?.estadoInscripcion ??
      null,
    estadoAsistencia:
      inscripcion?.estadoAsistencia ??
      null,
    horasRegistradas:
      inscripcion?.horasRegistradas ??
      null,
    fechaInscripcion:
      inscripcion?.creadaEn ?? null,
 })
}

export async function inscribirEstudianteEnActividad(
  identificador,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new EstudianteActividadesError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const actividades =
    leerActividadesSimuladas()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id,
    )

  if (indiceActividad === -1) {
    throw new EstudianteActividadesError(
      'La actividad seleccionada no existe.',
    )
  }

  const actividad =
    actividades[indiceActividad]

  if (!actividadEstaDisponible(actividad)) {
    throw new EstudianteActividadesError(
      'La actividad ya no se encuentra disponible.',
    )
  }

  const inscripciones =
    leerInscripcionesSimuladas()

  const inscripcionExistente =
    inscripciones.some(
      (inscripcion) =>
        inscripcion.numeroCuenta ===
          numeroCuenta &&
        inscripcion.actividadId === id &&
        inscripcion
          .estadoInscripcion !==
          'cancelada',
    )

  if (inscripcionExistente) {
    throw new EstudianteActividadesError(
      'Ya estás inscrito en esta actividad.',
    )
  }

  const fechaActual =
    new Date().toISOString()

  const actividadActualizada = {
    ...actividad,
    cuposDisponibles:
      actividad.cuposDisponibles - 1,
    actualizadaEn: fechaActual,
  }

  const nuevaInscripcion = {
    id: crearIdentificadorInscripcion(),
    actividadId: actividad.id,
    numeroCuenta,
    estadoInscripcion: 'inscrita',
    estadoAsistencia: 'Pendiente',
    horasRegistradas: null,
    cupoDescontado: true,
    creadaEn: fechaActual,

    /*
     * La copia conserva los datos básicos por si la actividad
     * cambia antes de aparecer en el historial.
     */
    actividad:
      actividadActualizada,
  }

  actividades[indiceActividad] =
    actividadActualizada

  inscripciones.push(
    nuevaInscripcion,
  )

  guardarActividadesSimuladas(
    actividades,
  )

  guardarInscripcionesSimuladas(
    inscripciones,
  )

  return clonarDatos(
    nuevaInscripcion,
  )
}

export async function cancelarInscripcionActividad(
  identificador,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new EstudianteActividadesError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const inscripciones =
    leerInscripcionesSimuladas()

  const indiceInscripcion =
    inscripciones.findIndex(
      (inscripcion) =>
        inscripcion.numeroCuenta ===
          numeroCuenta &&
        inscripcion.actividadId === id &&
        inscripcion
          .estadoInscripcion !==
          'cancelada',
    )

  if (indiceInscripcion === -1) {
    throw new EstudianteActividadesError(
      'No existe una inscripción activa para esta actividad.',
    )
  }

  const inscripcion =
    inscripciones[indiceInscripcion]

  if (
    normalizarEstado(
      inscripcion.estadoAsistencia,
    ) === 'asistió'
  ) {
    throw new EstudianteActividadesError(
      'No puedes cancelar una actividad que ya forma parte del historial.',
    )
  }

  const actividades =
    leerActividadesSimuladas()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id,
    )

  if (
    inscripcion.cupoDescontado &&
    indiceActividad !== -1
  ) {
    const actividad =
      actividades[indiceActividad]

    const cuposTotales =
      actividad.cuposTotales ??
      actividad.cuposDisponibles + 1

    actividades[indiceActividad] = {
      ...actividad,
      cuposDisponibles: Math.min(
        cuposTotales,
        actividad.cuposDisponibles + 1,
      ),
      actualizadaEn:
        new Date().toISOString(),
    }

    guardarActividadesSimuladas(
      actividades,
    )
  }

  /*
   * En el modo simulado retiramos la inscripción activa.
   * La versión oficial deberá conservar la cancelación
   * como un registro auditable dentro del backend.
   */
  inscripciones.splice(
    indiceInscripcion,
    1,
  )

  guardarInscripcionesSimuladas(
    inscripciones,
  )

  return clonarDatos({
    ...inscripcion,
    estadoInscripcion: 'cancelada',
    canceladaEn:
      new Date().toISOString(),
  })
}

/*
 * Restaura únicamente las inscripciones del estudiante
 * de prueba y devuelve los cupos descontados.
 *
 * Resulta útil para repetir manualmente el flujo
 * de inscripción y cancelación durante el desarrollo.
 */
export async function restablecerActividadesEstudiante() {
  if (!usarDatosSimulados) {
    throw new EstudianteActividadesError(
      'El restablecimiento solo está disponible con datos simulados.',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  const actividades =
    leerActividadesSimuladas()

  const inscripciones =
    leerInscripcionesSimuladas()

  const inscripcionesActivas =
    inscripciones.filter(
      (inscripcion) =>
        inscripcion.numeroCuenta ===
          numeroCuenta &&
        inscripcion
          .estadoInscripcion !==
          'cancelada' &&
        inscripcion.cupoDescontado,
    )

  for (
    const inscripcion
    of inscripcionesActivas
  ) {
    const indiceActividad =
      actividades.findIndex(
        (actividad) =>
          actividad.id ===
          inscripcion.actividadId,
      )

    if (indiceActividad === -1) {
      continue
    }

    const actividad =
      actividades[indiceActividad]

    const cuposTotales =
      actividad.cuposTotales ??
      actividad.cuposDisponibles + 1

    actividades[indiceActividad] = {
      ...actividad,
      cuposDisponibles: Math.min(
        cuposTotales,
        actividad.cuposDisponibles + 1,
      ),
      actualizadaEn:
        new Date().toISOString(),
    }
  }

  const inscripcionesOtrasCuentas =
    inscripciones.filter(
      (inscripcion) =>
        inscripcion.numeroCuenta !==
        numeroCuenta,
    )

  const inscripcionesIniciales =
    clonarDatos(
      inscripcionesEstudianteMock,
    )
      .map(normalizarInscripcion)
      .filter(Boolean)

  guardarActividadesSimuladas(
    actividades,
  )

  guardarInscripcionesSimuladas([
    ...inscripcionesOtrasCuentas,
    ...inscripcionesIniciales,
  ])

  return clonarDatos(
    inscripcionesIniciales,
  )
}