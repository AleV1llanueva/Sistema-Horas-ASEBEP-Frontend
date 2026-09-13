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

// Tipos de marcación para el estudiante.
const TIPOS_MARCACION_ASISTENCIA =
  Object.freeze({
    entrada: 'entrada',
    salida: 'salida',
  })

// Entrada y salida permancen disponibles durante veinte minutos
const DURACION_VENTANA_QR_MINUTOS = 20

/*
 * Los QR locales utilizan este prefijo para distinguirlos
 * de los JWT firmados que genera el backend.
 */
const PREFIJO_TOKEN_QR_SIMULADO =
  'asebep-mock.'

const ESTADOS_ACTIVIDAD_DISPONIBLE = [
  'programada',
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

// Obtiene la fecha local con formato YYYY-MM-DD.
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

// Revisa si el horario permite cancelar una inscripcion.
export function obtenerRestriccionCancelacionActividad(
  actividad,
  ahora = new Date(),
) {
  if (!actividad) {
    return 'No fue posible comprobar el horario de la actividad.'
  }

  // Un estado explicito tambien impide cancelar aunque el reloj difiera.
  const estado = normalizarEstado(
    actividad.estado,
  ).replace(/\s+/g, '-')

  if (estado === 'en-curso') {
    return 'No puedes cancelar una actividad que ya está en curso.'
  }

  if (['finalizada', 'completada'].includes(estado)) {
    return 'No puedes cancelar una actividad que ya finalizó.'
  }

  // Aceptamos HH:mm y HH:mm:ss; rechazamos horarios incompletos.
  const fecha = prepararTexto(actividad.fecha)
  const hora = prepararTexto(actividad.horaInicio)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora)
  ) {
    return 'No fue posible comprobar el horario de la actividad.'
  }

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [horas, minutos, segundos = 0] = hora.split(':').map(Number)

  const inicio = new Date(
    anio,
    mes - 1,
    dia,
    horas,
    minutos,
    segundos,
    0,
  )

  // Date ajusta automaticamente fechas inexistentes.
  if (
    inicio.getFullYear() !== anio ||
    inicio.getMonth() !== mes - 1 ||
    inicio.getDate() !== dia ||
    inicio.getHours() !== horas ||
    inicio.getMinutes() !== minutos ||
    inicio.getSeconds() !== segundos ||
    !(ahora instanceof Date) ||
    !Number.isFinite(ahora.getTime())
  ) {
    return 'No fue posible comprobar el horario de la actividad.'
  }

  // El bloqueo incluye el instante exacto de las dos horas previas.
  const anticipacionMinima = 2 * 60 * 60 * 1000
  const limiteCancelacion = inicio.getTime() - anticipacionMinima

  if (ahora.getTime() >= limiteCancelacion) {
    return 'La cancelación se cierra 2 horas antes del inicio de la actividad.'
  }

  return ''
}

/*
 * Construye una fecha y hora local a partir de los
 * formatos utilizados por las actividades.
 *
 * Acepta horas HH:mm y HH:mm:ss.
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
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(
      horaPreparada,
    )
  ) {
    return null
  }

  const [
    anio,
    mes,
    dia,
  ] = fechaPreparada
    .split('-')
    .map(Number)

  const [
    horas,
    minutos,
    segundos = 0,
  ] = horaPreparada
    .split(':')
    .map(Number)

  const fechaHora = new Date(
    anio,
    mes - 1,
    dia,
    horas,
    minutos,
    segundos,
    0,
  )

  /*
   * Date ajusta automáticamente valores imposibles.
   * Comparamos todas las partes para rechazarlos.
   */
  const fechaHoraValida =
    fechaHora.getFullYear() === anio &&
    fechaHora.getMonth() === mes - 1 &&
    fechaHora.getDate() === dia &&
    fechaHora.getHours() === horas &&
    fechaHora.getMinutes() === minutos &&
    fechaHora.getSeconds() === segundos

  return fechaHoraValida
    ? fechaHora
    : null
}

/*
 * Construye la ventana oficial de una marcación.
 *
 * Entrada: comienza a la hora de inicio.
 * Salida: comienza a la hora de finalización.
 */
function obtenerVentanaMarcacionActividad(
  actividad,
  tipo,
) {
  const inicio =
    crearFechaHoraLocalActividad(
      actividad?.fecha,
      actividad?.horaInicio,
    )

  const finalizacion =
    crearFechaHoraLocalActividad(
      actividad?.fecha,
      actividad?.horaFinalizacion,
    )

  if (!inicio || !finalizacion) {
    return null
  }

  const comienzaEn =
    tipo ===
    TIPOS_MARCACION_ASISTENCIA.entrada
      ? inicio
      : tipo ===
          TIPOS_MARCACION_ASISTENCIA.salida
        ? finalizacion
        : null

  if (!comienzaEn) {
    return null
  }

  const expiraEn = new Date(
    comienzaEn.getTime() +
      DURACION_VENTANA_QR_MINUTOS *
        60 *
        1000,
  )

  return {
    comienzaEn,
    expiraEn,
  }
}

/*
 * Evalúa la ventana sin depender de campos de habilitación.
 * Esta comprobación se comparte entre la vista y el registro.
 */
function evaluarVentanaMarcacionActividad({
  actividad,
  tipo,
  ahora,
}) {
  if (
    !(ahora instanceof Date) ||
    !Number.isFinite(ahora.getTime())
  ) {
    return {
      disponible: false,
      mensaje:
        'No fue posible comprobar el horario de la marcación.',
      expiraEn: null,
    }
  }

  const ventana =
    obtenerVentanaMarcacionActividad(
      actividad,
      tipo,
    )

  if (!ventana) {
    return {
      disponible: false,
      mensaje:
        'No fue posible comprobar el horario de la actividad.',
      expiraEn: null,
    }
  }

  if (
    ahora.getTime() <
    ventana.comienzaEn.getTime()
  ) {
    return {
      disponible: false,

      mensaje:
        tipo ===
        TIPOS_MARCACION_ASISTENCIA.entrada
          ? 'La entrada estará disponible cuando comience la actividad.'
          : 'La salida estará disponible cuando finalice la actividad.',

      expiraEn:
        ventana.expiraEn.toISOString(),
    }
  }

  if (
    ahora.getTime() >=
    ventana.expiraEn.getTime()
  ) {
    return {
      disponible: false,

      mensaje:
        tipo ===
        TIPOS_MARCACION_ASISTENCIA.entrada
          ? 'La ventana de veinte minutos para registrar la entrada ya finalizó.'
          : 'La ventana de veinte minutos para registrar la salida ya finalizó.',

      expiraEn:
        ventana.expiraEn.toISOString(),
    }
  }

  return {
    disponible: true,

    mensaje:
      tipo ===
      TIPOS_MARCACION_ASISTENCIA.entrada
        ? 'Escanea el QR de entrada mostrado por el administrador.'
        : 'Escanea el QR de salida mostrado por el administrador.',

    expiraEn:
      ventana.expiraEn.toISOString(),
  }
}

/*
 * Determina si una actividad ya terminó.
 *
 * Primero respeta el estado explícito del sistema.
 * Si el administrador todavía no actualizó el estado,
 * utiliza la fecha y la hora final como respaldo.
 */
export function actividadHaFinalizado(
  actividad,
  ahora = new Date(),
) {
  const estado =
    normalizarEstado(
      actividad?.estado,
    ).replace(/\s+/g, '-')

  if (
    [
      'finalizada',
      'completada',
    ].includes(estado)
  ) {
    return true
  }

  const finalizacion =
    crearFechaHoraLocalActividad(
      actividad?.fecha,
      actividad?.horaFinalizacion,
    )

  if (
    !finalizacion ||
    !(ahora instanceof Date) ||
    !Number.isFinite(
      ahora.getTime(),
    )
  ) {
    return false
  }

  return (
    ahora.getTime() >=
    finalizacion.getTime()
  )
}

/*
 * Resume el progreso de asistencia del estudiante.
 *
 * Este valor se calcula a partir de las marcaciones,
 * por lo que no necesita guardarse en localStorage.
 */
export function obtenerSituacionAsistenciaActividad(
  actividad,
  ahora = new Date(),
) {
  const tieneInscripcion =
    actividad?.inscrito === true ||
    Boolean(
      actividad?.inscripcionId,
    )

  if (!tieneInscripcion) {
    return 'sin-inscripcion'
  }

  const entradaRegistrada =
    actividad?.entradaRegistrada === true

  const salidaRegistrada =
    actividad?.salidaRegistrada === true

  /*
   * La asistencia solamente se completa cuando
   * existen las dos marcaciones.
   */
  if (
    entradaRegistrada &&
    salidaRegistrada
  ) {
    return 'asistio'
  }

  /*
   * Si terminó con entrada y sin salida,
   * se requiere comprobante externo.
   */
  if (
    entradaRegistrada &&
    actividadHaFinalizado(
      actividad,
      ahora,
    )
  ) {
    return 'incompleta'
  }

  if (entradaRegistrada) {
    return 'entrada-registrada'
  }

  /*
   * Esta situación permitirá informar posteriormente
   * que no existe ninguna marcación.
   */
  if (
    actividadHaFinalizado(
      actividad,
      ahora,
    )
  ) {
    return 'sin-registro'
  }

  return 'pendiente'
}

function normalizarEstado(valor) {
  return prepararTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, '-')
}

// Valida y devuelve uno de los dos tipos de marcación.
function prepararTipoMarcacionAsistencia(
  tipo,
) {
  const tipoPreparado =
    normalizarEstado(tipo)

  if (
    !Object.values(
      TIPOS_MARCACION_ASISTENCIA,
    ).includes(tipoPreparado)
  ) {
    throw new EstudianteActividadesError(
      'El tipo de marcación solicitado no es válido.',
    )
  }

  return tipoPreparado
}

// Comprueba que el reloj recibido representa una fecha válida.
function prepararInstanteMarcacion(
  ahora,
) {
  if (
    !(ahora instanceof Date) ||
    !Number.isFinite(ahora.getTime())
  ) {
    throw new EstudianteActividadesError(
      'No fue posible comprobar la vigencia del código QR.',
    )
  }

  return ahora
}

/*
 * Decodifica exclusivamente los tokens creados por el mock.
 *
 * Esta codificación no sustituye una firma criptográfica. Su
 * propósito es reproducir localmente el contrato del backend,
 * que será quien valide los JWT en el modo conectado a la API.
 */
function decodificarTokenQrSimulado(
  token,
) {
  const tokenPreparado =
    prepararTexto(token)

  if (
    !tokenPreparado.startsWith(
      PREFIJO_TOKEN_QR_SIMULADO,
    )
  ) {
    throw new EstudianteActividadesError(
      'El código QR simulado no tiene un formato válido.',
    )
  }

  if (
    typeof atob !== 'function' ||
    typeof TextDecoder === 'undefined'
  ) {
    throw new EstudianteActividadesError(
      'Este navegador no permite leer el código QR simulado.',
    )
  }

  try {
    const base64Url =
      tokenPreparado.slice(
        PREFIJO_TOKEN_QR_SIMULADO.length,
      )

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const relleno = '='.repeat(
      (4 - (base64.length % 4)) % 4,
    )

    const contenidoBinario =
      atob(base64 + relleno)

    const bytes = Uint8Array.from(
      contenidoBinario,
      (caracter) =>
        caracter.charCodeAt(0),
    )

    const contenido = JSON.parse(
      new TextDecoder().decode(bytes),
    )

    if (
      !contenido ||
      typeof contenido !== 'object' ||
      Array.isArray(contenido)
    ) {
      throw new Error()
    }

    return contenido
  } catch {
    throw new EstudianteActividadesError(
      'El código QR simulado está dañado o no es válido.',
    )
  }
}

/*
 * Extrae el tipo y el token desde el contenido leído por
 * la cámara. Acepta enlaces absolutos y relativos para que
 * funcione con localhost, una vista temporal o el dominio final.
 */
export function interpretarCodigoQrAsistencia(
  contenidoQr,
  tipoEsperado = null,
) {
  const contenidoPreparado =
    prepararTexto(contenidoQr)

  if (!contenidoPreparado) {
    throw new EstudianteActividadesError(
      'El código QR escaneado está vacío.',
    )
  }

  const origenActual =
    typeof window !== 'undefined' &&
    window.location?.origin
      ? window.location.origin
      : 'http://localhost'

  let urlQr

  try {
    urlQr = new URL(
      contenidoPreparado,
      origenActual,
    )
  } catch {
    throw new EstudianteActividadesError(
      'El código escaneado no contiene un enlace válido.',
    )
  }

  const coincidenciaRuta =
    urlQr.pathname.match(
      /\/asistencia\/(entrada|salida)\/?$/,
    )

  if (!coincidenciaRuta) {
    throw new EstudianteActividadesError(
      'El código escaneado no corresponde a una asistencia de ASEBEP.',
    )
  }

  const tipo =
    prepararTipoMarcacionAsistencia(
      coincidenciaRuta[1],
    )

  if (tipoEsperado !== null) {
    const tipoSolicitado =
      prepararTipoMarcacionAsistencia(
        tipoEsperado,
      )

    if (tipo !== tipoSolicitado) {
      throw new EstudianteActividadesError(
        tipoSolicitado ===
          TIPOS_MARCACION_ASISTENCIA.entrada
          ? 'Escaneaste un QR de salida. Utiliza el QR de entrada.'
          : 'Escaneaste un QR de entrada. Utiliza el QR de salida.',
      )
    }
  }

  const token = prepararTexto(
    urlQr.searchParams.get('token'),
  )

  if (!token) {
    throw new EstudianteActividadesError(
      'El código QR no contiene el token de asistencia.',
    )
  }

  return {
    tipo,
    token,
  }
}

// Entrega el mensaje final que verá el estudiante.
function obtenerMensajeMarcacionExitosa(
  tipo,
) {
  return tipo ===
    TIPOS_MARCACION_ASISTENCIA.entrada
    ? 'Se ha registrado tu hora de entrada exitosamente.'
    : 'Se ha registrado tu hora de salida exitosamente.'
}

/*
 * Valida la estructura y vigencia interna del token local.
 * La ventana oficial también se verificará con la actividad.
 */
function validarTokenQrSimulado({
  token,
  tipo,
  ahora,
}) {
  const contenido =
    decodificarTokenQrSimulado(token)

  const actividadId =
    prepararTexto(
      contenido.actividadId,
    )

  const tipoToken =
    normalizarEstado(
      contenido.tipo,
    )

  const nonce =
    prepararTexto(
      contenido.nonce,
    )

  /*
   * Conservamos el nombre habilitadaEn para leer tokens
   * simulados ya existentes, aunque ahora representa
   * simplemente el momento de generación.
   */
  const generadoEn =
    prepararTexto(
      contenido.habilitadaEn ??
        contenido.generadoEn,
    )

  const expiraEn =
    prepararTexto(
      contenido.expiraEn,
    )

  const generadoEnMilisegundos =
    Date.parse(generadoEn)

  const expiraEnMilisegundos =
    Date.parse(expiraEn)

  if (
    contenido.version !== 1 ||
    !actividadId ||
    !nonce ||
    tipoToken !== tipo ||
    !Number.isFinite(
      generadoEnMilisegundos,
    ) ||
    !Number.isFinite(
      expiraEnMilisegundos,
    ) ||
    expiraEnMilisegundos <=
      generadoEnMilisegundos
  ) {
    throw new EstudianteActividadesError(
      'El código QR simulado no contiene información válida.',
    )
  }

  if (
    ahora.getTime() <
    generadoEnMilisegundos
  ) {
    throw new EstudianteActividadesError(
      'El código QR todavía no se encuentra disponible.',
    )
  }

  if (
    ahora.getTime() >=
    expiraEnMilisegundos
  ) {
    throw new EstudianteActividadesError(
      'El código QR ya venció.',
    )
  }

  return {
    actividadId,
    tipo: tipoToken,
    generadoEn,
    expiraEn,
  }
}

/*
 * Recupera el último token simulado guardado.
 *
 * Esta comparación permite invalidar un código anterior
 * cuando el administrador solicita uno nuevo.
 */
function obtenerConfiguracionQrActividad(
  actividad,
  tipo,
) {
  const esEntrada =
    tipo ===
    TIPOS_MARCACION_ASISTENCIA.entrada

  return {
    token: prepararTexto(
      esEntrada
        ? actividad
            ?.tokenEntradaSimulado
        : actividad
            ?.tokenSalidaSimulado,
    ),
  }
}

/*
 * Expone a la vista la disponibilidad automática
 * de entrada o salida.
 */
export function obtenerDisponibilidadMarcacionActividad(
  actividad,
  tipo,
  ahora = new Date(),
) {
  let tipoPreparado

  try {
    tipoPreparado =
      prepararTipoMarcacionAsistencia(
        tipo,
      )
  } catch (error) {
    return {
      disponible: false,
      mensaje:
        error instanceof Error
          ? error.message
          : 'La marcación solicitada no es válida.',
      expiraEn: null,
    }
  }

  if (
    !actividad ||
    actividad.inscrito !== true
  ) {
    return {
      disponible: false,
      mensaje:
        'Debes estar inscrito para registrar asistencia.',
      expiraEn: null,
    }
  }

  if (
    actividad.activa === false ||
    actividad.eliminada === true ||
    normalizarEstado(
      actividad.estado,
    ) === 'cancelada'
  ) {
    return {
      disponible: false,
      mensaje:
        'La actividad ya no se encuentra activa.',
      expiraEn: null,
    }
  }

  const esEntrada =
    tipoPreparado ===
    TIPOS_MARCACION_ASISTENCIA.entrada

  if (
    esEntrada &&
    actividad.entradaRegistrada === true
  ) {
    return {
      disponible: false,
      mensaje:
        'Tu hora de entrada ya fue registrada.',
      expiraEn: null,
    }
  }

  if (
    !esEntrada &&
    actividad.salidaRegistrada === true
  ) {
    return {
      disponible: false,
      mensaje:
        'Tu hora de salida ya fue registrada.',
      expiraEn: null,
    }
  }

  if (
    !esEntrada &&
    actividad.entradaRegistrada !== true
  ) {
    return {
      disponible: false,
      mensaje:
        'Primero debes registrar tu hora de entrada.',
      expiraEn: null,
    }
  }

  return evaluarVentanaMarcacionActividad({
    actividad,
    tipo: tipoPreparado,
    ahora,
  })
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
 * Adapta los datos simulados y el contrato de la API.
 *
 * La interfaz siempre utiliza propiedades camelCase,
 * aunque el backend responda con snake_case.
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

  /*
   * En el sistema oficial "cupos" representa la capacidad total
   * y "cupos_disponibles" representa los espacios libres.
   */
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
        actividad.cupos_totales ??
        actividad.cupos,
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
      actividad.fecha ??
        actividad.fecha_actividad,
    ),

    horaInicio: prepararTexto(
      actividad.horaInicio ??
        actividad.hora_inicio ??
        actividad.hora,
    ),

    horaFinalizacion: prepararTexto(
      actividad.horaFinalizacion ??
        actividad.hora_finalizacion ??
        actividad.horaFinal ??
        actividad.hora_final ??
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
          actividad.horas_asignar ??
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

    /*
     * Información del QR de entrada.
     *
     * En el modo simulado conservamos el token vigente para
     * comprobar que no se utilice una generación anterior.
     */
    entradaHabilitada:
      actividad.entradaHabilitada ===
        true ||
      actividad.entrada_habilitada ===
        true ||
      actividad.qrEntradaHabilitado ===
        true ||
      actividad.qr_entrada_habilitado ===
        true,

    entradaHabilitadaEn:
      prepararTexto(
        actividad.entradaHabilitadaEn ??
          actividad.entrada_habilitada_en ??
          actividad.qrEntradaHabilitadaEn ??
          actividad.qr_entrada_habilitada_en,
      ) || null,

    entradaHabilitadaHasta:
      prepararTexto(
        actividad.entradaHabilitadaHasta ??
          actividad.entrada_habilitada_hasta ??
          actividad.qrEntradaExpiraEn ??
          actividad.qr_entrada_expira_en,
      ) || null,

    tokenEntradaSimulado:
      prepararTexto(
        actividad.tokenEntradaSimulado ??
          actividad.token_entrada_simulado ??
          actividad.tokenEntrada ??
          actividad.token_entrada,
      ) || null,

    /*
     * Información del QR de salida. Utiliza la misma forma
     * que la entrada para compartir la lógica de validación.
     */

    salidaHabilitada:
      actividad.salidaHabilitada ===
        true ||
      actividad.salida_habilitada ===
        true ||
      actividad.qrSalidaHabilitado ===
        true ||
      actividad.qr_salida_habilitado ===
        true,

    salidaHabilitadaEn:
      prepararTexto(
        actividad.salidaHabilitadaEn ??
          actividad.salida_habilitada_en ??
          actividad.qrSalidaHabilitadaEn ??
          actividad.qr_salida_habilitada_en,
      ) || null,

    salidaHabilitadaHasta:
      prepararTexto(
        actividad.salidaHabilitadaHasta ??
          actividad.salida_habilitada_hasta ??
          actividad.qrSalidaExpiraEn ??
          actividad.qr_salida_expira_en,
      ) || null,

    tokenSalidaSimulado:
      prepararTexto(
        actividad.tokenSalidaSimulado ??
          actividad.token_salida_simulado ??
          actividad.tokenSalida ??
          actividad.token_salida,
      ) || null,

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

  const estadoAsistencia =
    prepararTexto(
      inscripcion.estadoAsistencia ??
        inscripcion.estado_asistencia ??
        inscripcion.estado,
    ) || 'Pendiente'

  /*
   * Estas propiedades indican si cada marcación
   * fue confirmada individualmente.
   */
  const entradaRegistrada =
    inscripcion.entradaRegistrada === true ||
    inscripcion.entrada_registrada === true ||
    inscripcion.checkIn === true ||
    inscripcion.check_in === true

  const salidaRegistrada =
    inscripcion.salidaRegistrada === true ||
    inscripcion.salida_registrada === true ||
    inscripcion.checkOut === true ||
    inscripcion.check_out === true

  const tieneDetalleMarcaciones = [
    'entradaRegistrada',
    'entrada_registrada',
    'checkIn',
    'check_in',
    'salidaRegistrada',
    'salida_registrada',
    'checkOut',
    'check_out',
  ].some(
    (propiedad) =>
      Object.prototype.hasOwnProperty.call(
        inscripcion,
        propiedad,
      ),
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
          inscripcion.estado_inscripcion,
      ) || 'inscrita',

    estadoAsistencia,

    entradaRegistrada,
    salidaRegistrada,
    tieneDetalleMarcaciones,
    entradaRegistradaEn:
      prepararTexto(
        inscripcion.entradaRegistradaEn ??
          inscripcion.entrada_registrada_en ??
          inscripcion.horaEntrada ??
          inscripcion.hora_entrada,
      ) || null,

    salidaRegistradaEn:
      prepararTexto(
        inscripcion.salidaRegistradaEn ??
          inscripcion.salida_registrada_en ??
          inscripcion.horaSalida ??
          inscripcion.hora_salida,
      ) || null,

    horasRegistradas:
      prepararEntero(
        inscripcion.horasRegistradas ??
          inscripcion.horas_registradas,
        null,
      ),

    cupoDescontado:
      inscripcion.cupoDescontado === true ||
      inscripcion.cupo_descontado === true,

    creadaEn:
      prepararTexto(
        inscripcion.creadaEn ??
          inscripcion.creada_en,
      ) || null,

    actualizadaEn:
      prepararTexto(
        inscripcion.actualizadaEn ??
          inscripcion.actualizada_en,
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
   * un estudiante.
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

/*
 * Combina la actividad con el estado particular
 * de la inscripción del estudiante.
 */
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

  const detalleActividad = {
    ...actividad,
    inscrito: true,

    inscripcionId:
      inscripcion.id,

    estadoInscripcion:
      inscripcion.estadoInscripcion,

    estadoAsistencia:
      inscripcion.estadoAsistencia,

    entradaRegistrada:
      inscripcion.entradaRegistrada,

    entradaRegistradaEn:
      inscripcion.entradaRegistradaEn,

    salidaRegistrada:
      inscripcion.salidaRegistrada,

    salidaRegistradaEn:
      inscripcion.salidaRegistradaEn,

    tieneDetalleMarcaciones:
      inscripcion
        .tieneDetalleMarcaciones,

    horasRegistradas:
      inscripcion.horasRegistradas,

    fechaInscripcion:
      inscripcion.creadaEn,
  }

  return {
    ...detalleActividad,

    situacionAsistencia:
      obtenerSituacionAsistenciaActividad(
        detalleActividad,
      ),
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
 * Convierte la respuesta plana de GET /asistencias
 * en una actividad compatible con las tarjetas del portal.
 *
 * Cuando GET /actividades también contiene el registro, esa
 * versión actual tendrá prioridad al combinar las colecciones.
 */
function crearActividadDesdeInscripcionApi(
  inscripcion,
) {
  const fecha = prepararTexto(
    inscripcion?.fecha_actividad ??
      inscripcion?.fecha,
  )

  const estadoCalculado =
    fecha &&
    fecha < obtenerFechaHoy()
      ? 'finalizada'
      : 'programada'

  return normalizarActividad({
    id:
      inscripcion?.actividad_id ??
      inscripcion?.actividadId,
    titulo: inscripcion?.titulo,
    descripcion:
      inscripcion?.descripcion,
    fecha_actividad: fecha,
    hora_inicio:
      inscripcion?.hora_inicio,
    hora_final:
      inscripcion?.hora_final,
    ubicacion:
      inscripcion?.ubicacion,
    horas_asignar:
      inscripcion?.horas_asignar,
    estado:
      inscripcion?.estado_actividad ??
      estadoCalculado,
    activa: true,
    eliminada: false,
  })
}

/*
 * Consulta las inscripciones reales del becario autenticado.
 * El número de cuenta proviene del JWT y se añade solamente
 * a la estructura interna utilizada por el frontend.
 */
async function listarInscripcionesDesdeApi(
  numeroCuenta,
) {
  const respuesta = await apiFetch(
    '/asistencias',
  )

  const coleccion =
    Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(
            respuesta?.inscripciones,
          )
        ? respuesta.inscripciones
        : Array.isArray(
              respuesta?.data,
            )
          ? respuesta.data
          : null

  if (!coleccion) {
    throw new EstudianteActividadesError(
      'La API no devolvió una lista válida de inscripciones.',
    )
  }

  return coleccion
    .map((inscripcion) => {
      const actividad =
        crearActividadDesdeInscripcionApi(
          inscripcion,
        )

      return normalizarInscripcion({
        ...inscripcion,
        numeroCuenta,
        actividad,
      })
    })
    .filter(
      (inscripcion) =>
        Boolean(
          inscripcion?.id &&
          inscripcion.actividadId,
        ),
    )
}

/*
 * Las tres pestañas de Activities se cargan al mismo tiempo.
 * Conservamos la consulta en curso para que esa carga inicial
 * realice una sola petición por endpoint, en lugar de repetirlas.
 */
let consultaColeccionesApiEnCurso = null
let cuentaConsultaColeccionesApi = null

async function obtenerColeccionesEstudianteDesdeApi(
  numeroCuenta,
) {
  if (
    !consultaColeccionesApiEnCurso ||
    cuentaConsultaColeccionesApi !==
      numeroCuenta
  ) {
    cuentaConsultaColeccionesApi =
      numeroCuenta

    consultaColeccionesApiEnCurso =
      Promise.all([
        listarActividadesDesdeApi(),
        listarInscripcionesDesdeApi(
          numeroCuenta,
        ),
      ]).then(
        ([actividades, inscripciones]) => ({
          actividades,
          inscripciones,
        }),
      )
  }

  const consultaActual =
    consultaColeccionesApiEnCurso

  try {
    return await consultaActual
  } finally {
    if (
      consultaColeccionesApiEnCurso ===
      consultaActual
    ) {
      consultaColeccionesApiEnCurso = null
      cuentaConsultaColeccionesApi = null
    }
  }
}

/*
 * Construye una sola colección combinando las actividades
 * publicadas con el estado particular de cada inscripción.
 */
function combinarInscripciones(
  inscripciones,
  actividades,
) {
  const actividadesPorId =
    new Map(
      actividades.map(
        (actividad) => [
          actividad.id,
          actividad,
        ],
      ),
    )

  return inscripciones
    .map(
      (inscripcion) =>
        combinarInscripcionConActividad(
          inscripcion,
          actividadesPorId,
        ),
    )
    .filter(Boolean)
}

export async function listarActividadesDisponibles() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    const {
      actividades,
      inscripciones,
    } =
      await obtenerColeccionesEstudianteDesdeApi(
        numeroCuenta,
      )

    const actividadesInscritas =
      new Set(
        inscripciones
          .filter(
            (inscripcion) =>
              inscripcion
                .estadoInscripcion !==
              'cancelada',
          )
          .map(
            (inscripcion) =>
              inscripcion.actividadId,
          ),
      )

    return clonarDatos(
      ordenarPorFechaAscendente(
        actividades.filter(
          (actividad) =>
            actividadEstaDisponible(
              actividad,
            ) &&
            !actividadesInscritas.has(
              actividad.id,
            ),
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
    const {
      actividades,
      inscripciones,
    } =
      await obtenerColeccionesEstudianteDesdeApi(
        numeroCuenta,
      )

    const proximas =
      combinarInscripciones(
        inscripciones.filter(
          (inscripcion) =>
            inscripcion
              .estadoInscripcion !==
              'cancelada' &&
            !(
              inscripcion
                .entradaRegistrada &&
              inscripcion
                .salidaRegistrada
            ),
        ),
        actividades,
      )
        .filter(
          (actividad) =>
            actividad.fecha >=
              obtenerFechaHoy() ||
            actividad
              .situacionAsistencia ===
              'incompleta',
        )

    return clonarDatos(
      ordenarPorFechaAscendente(
        proximas,
      ),
    )
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
          !(
            inscripcion
              .entradaRegistrada &&
            inscripcion
              .salidaRegistrada
          ),
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
        (
          actividad.fecha >=
            obtenerFechaHoy() ||
          actividad
            .situacionAsistencia === 'incompleta'
        ),
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
    const {
      actividades,
      inscripciones,
    } =
      await obtenerColeccionesEstudianteDesdeApi(
        numeroCuenta,
      )

    const historial =
      combinarInscripciones(
        inscripciones.filter(
          (inscripcion) =>
            inscripcion
              .estadoInscripcion !==
              'cancelada' &&
            inscripcion
              .entradaRegistrada &&
            inscripcion
              .salidaRegistrada,
        ),
        actividades,
      )

    return clonarDatos(
      ordenarPorFechaDescendente(
        historial,
      ),
    )
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
          inscripcion
            .entradaRegistrada &&
          inscripcion
            .salidaRegistrada,
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
   * En modo API combinamos la actividad publicada con la
   * inscripción real del becario cuando esta existe.
   */
  if (!usarDatosSimulados) {
    const {
      actividades,
      inscripciones,
    } =
      await obtenerColeccionesEstudianteDesdeApi(
        numeroCuenta,
      )

    const inscripcion =
      inscripciones.find(
        (elemento) =>
          elemento.actividadId === id &&
          elemento.estadoInscripcion !==
            'cancelada',
      ) ?? null

    const actividadActual =
      actividades.find(
        (elemento) =>
          elemento.id === id &&
          elemento.eliminada !== true,
      ) ?? null

    const actividad =
      actividadActual ??
      inscripcion?.actividad ??
      null

    if (!actividad) {
      return null
    }

    if (inscripcion) {
      const actividadesPorId =
        new Map([
          [actividad.id, actividad],
        ])

      return clonarDatos(
        combinarInscripcionConActividad(
          inscripcion,
          actividadesPorId,
        ),
      )
    }

    return clonarDatos({
      ...actividad,
      inscrito: false,
      inscripcionId: null,
      estadoInscripcion: null,
      estadoAsistencia: null,
      entradaRegistrada: false,
      entradaRegistradaEn: null,
      salidaRegistrada: false,
      salidaRegistradaEn: null,
      tieneDetalleMarcaciones: false,
      situacionAsistencia:
        'sin-inscripcion',
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

const detalleActividad = {
  ...actividad,

  inscrito:
    Boolean(inscripcion),

  inscripcionId:
    inscripcion?.id ?? null,

  estadoInscripcion:
    inscripcion?.estadoInscripcion ??
    null,

  estadoAsistencia:
    inscripcion?.estadoAsistencia ??
    null,

  entradaRegistrada:
    inscripcion?.entradaRegistrada ===
    true,

  entradaRegistradaEn:
    inscripcion?.entradaRegistradaEn ??
    null,

  salidaRegistrada:
    inscripcion?.salidaRegistrada ===
    true,

  salidaRegistradaEn:
    inscripcion?.salidaRegistradaEn ??
    null,

  tieneDetalleMarcaciones:
    inscripcion
      ?.tieneDetalleMarcaciones ??
    false,

  horasRegistradas:
    inscripcion?.horasRegistradas ??
    null,

  fechaInscripcion:
    inscripcion?.creadaEn ?? null,
}

return clonarDatos({
  ...detalleActividad,

  situacionAsistencia:
    obtenerSituacionAsistenciaActividad(
      detalleActividad,
    ),
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
    const respuesta = await apiFetch(
      `/asistencias/actividades/${encodeURIComponent(
        id,
      )}`,
      {
        method: 'POST',
      },
    )

    const inscripcion =
      normalizarInscripcion({
        ...respuesta,
        numeroCuenta,
      })

    return clonarDatos(
      inscripcion ?? respuesta,
    )
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

    // Una inscripcion nueva todavia no posee ninguna marcacion de asistencia.
    entradaRegistrada: false,
    entradaRegistradaEn: null,
    salidaRegistrada: false,
    salidaRegistradaEn: null,

    horasRegistradas: null,
    cupoDescontado: true,
    creadaEn: fechaActual,
    actualizadaEn: fechaActual,

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
    const respuesta = await apiFetch(
      `/asistencias/actividades/${encodeURIComponent(
        id,
      )}`,
      {
        method: 'DELETE',
      },
    )

    return clonarDatos({
      actividadId: id,
      numeroCuenta,
      estadoInscripcion: 'cancelada',
      mensaje:
        prepararTexto(
          respuesta?.mensaje,
        ) ||
        'Inscripción cancelada exitosamente.',
    })
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
    ) === 'asistio'
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

  const actividadParaValidar =
    actividades[indiceActividad] ??
    inscripcion.actividad

  // Comprobamos la hora al ejecutar la cancelacion.
  const restriccionCancelacion =
    obtenerRestriccionCancelacionActividad(
      actividadParaValidar,
    )
  if (restriccionCancelacion) {
    throw new EstudianteActividadesError(
      restriccionCancelacion,
    )
  }

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
 * Registra la entrada o la salida a partir del token leído.
 *
 * Modo API:
 * - El backend valida la firma JWT, su expiración y que sea
 *   el último token generado para la actividad.
 *
 * Modo simulado:
 * - Validamos el contenido codificado, su vigencia y la
 *   inscripción perteneciente a la sesión actual.
 * - Cuando administrador y estudiante comparten localStorage,
 *   también se compara con el último token habilitado.
 */
export async function registrarAsistenciaPorQr({
  tipo,
  token,
  ahora = new Date(),
}) {
  const tipoPreparado =
    prepararTipoMarcacionAsistencia(
      tipo,
    )

  const tokenPreparado =
    prepararTexto(token)

  const instanteActual =
    prepararInstanteMarcacion(ahora)

  if (!tokenPreparado) {
    throw new EstudianteActividadesError(
      'El token de asistencia es obligatorio.',
    )
  }

  /*
   * Esta llamada comprueba que existe una sesión válida.
   * En modo API, apiFetch añadirá el mismo JWT al encabezado.
   */
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    const respuesta = await apiFetch(
        `/asistencias/${tipoPreparado}` +
        `?token=${encodeURIComponent(
          tokenPreparado,
        )}`,
      {
        method: 'GET',
      },
    )

    return {
      tipo: tipoPreparado,
      actividadId: null,
      numeroCuenta,
      registradaEn:
        instanteActual.toISOString(),
      estadoAsistencia:
        tipoPreparado ===
        TIPOS_MARCACION_ASISTENCIA.salida
          ? 'Asistió'
          : 'Pendiente',
      mensaje:
        obtenerMensajeMarcacionExitosa(
          tipoPreparado,
        ),
      mensajeServidor:
        prepararTexto(
          respuesta?.mensaje,
        ) || null,
    }
  }

  const datosQr =
    validarTokenQrSimulado({
      token: tokenPreparado,
      tipo: tipoPreparado,
      ahora: instanteActual,
    })

  const inscripciones =
    leerInscripcionesSimuladas()

  const indiceInscripcion =
    inscripciones.findIndex(
      (inscripcion) =>
        inscripcion.numeroCuenta ===
          numeroCuenta &&
        inscripcion.actividadId ===
          datosQr.actividadId &&
        inscripcion.estadoInscripcion !==
          'cancelada',
    )

  if (indiceInscripcion === -1) {
    throw new EstudianteActividadesError(
      'No estás inscrito en la actividad correspondiente a este QR.',
    )
  }

  const actividades =
    leerActividadesSimuladas()

  const actividadActual =
    actividades.find(
      (actividad) =>
        actividad.id ===
        datosQr.actividadId,
    ) ?? null

  const inscripcion =
    inscripciones[indiceInscripcion]

  const actividad =
    actividadActual ??
    inscripcion.actividad

  if (!actividad) {
    throw new EstudianteActividadesError(
      'No fue posible encontrar la actividad asociada al código QR.',
    )
  }

    if (
    actividadActual &&
    (
      actividadActual.eliminada === true ||
      actividadActual.activa === false ||
      normalizarEstado(
        actividadActual.estado,
      ) === 'cancelada'
    )
    ) {
    throw new EstudianteActividadesError(
      'La actividad asociada al código QR ya no se encuentra activa.',
    )
  }

  /*
   * Comprobamos nuevamente la ventana oficial.
   * No confiamos únicamente en la fecha incluida en el token.
   */
  const disponibilidadVentana =
    evaluarVentanaMarcacionActividad({
      actividad,
      tipo: tipoPreparado,
      ahora: instanteActual,
    })

  if (
    !disponibilidadVentana.disponible
  ) {
    throw new EstudianteActividadesError(
      disponibilidadVentana.mensaje,
    )
  }

  const configuracionActual =
    obtenerConfiguracionQrActividad(
      actividadActual,
      tipoPreparado,
    )

  /*
   * Si existe una actividad administrativa compartida,
   * el token escaneado debe ser exactamente el último generado.
   */
  if (
    configuracionActual.token &&
    configuracionActual.token !==
      tokenPreparado
  ) {
    throw new EstudianteActividadesError(
      'Este código QR fue reemplazado por uno más reciente.',
    )
  }

  const esEntrada =
    tipoPreparado ===
    TIPOS_MARCACION_ASISTENCIA.entrada

  if (
    esEntrada &&
    inscripcion.entradaRegistrada
  ) {
    throw new EstudianteActividadesError(
      'Ya registraste tu hora de entrada.',
    )
  }

  if (
    !esEntrada &&
    !inscripcion.entradaRegistrada
  ) {
    throw new EstudianteActividadesError(
      'Debes registrar tu hora de entrada antes de marcar la salida.',
    )
  }

  if (
    !esEntrada &&
    inscripcion.salidaRegistrada
  ) {
    throw new EstudianteActividadesError(
      'Ya registraste tu hora de salida.',
    )
  }

  const fechaMarcacion =
    instanteActual.toISOString()

  const horasAcreditables = Math.max(
    0,
    prepararEntero(
      actividad.horasAcreditables,
      0,
    ),
  )

  const inscripcionActualizada = esEntrada
    ? {
        ...inscripcion,
        estadoInscripcion: 'inscrita',
        estadoAsistencia: 'Pendiente',
        entradaRegistrada: true,
        entradaRegistradaEn:
          fechaMarcacion,
        actualizadaEn: fechaMarcacion,
        actividad,
      }
    : {
        ...inscripcion,
        estadoInscripcion: 'completada',
        estadoAsistencia: 'Asistió',
        salidaRegistrada: true,
        salidaRegistradaEn:
          fechaMarcacion,
        horasRegistradas:
          horasAcreditables,
        actualizadaEn: fechaMarcacion,
        actividad,
      }

  inscripciones[indiceInscripcion] =
    inscripcionActualizada

  guardarInscripcionesSimuladas(
    inscripciones,
  )

  const detalleActualizado = {
    ...actividad,
    inscrito: true,
    inscripcionId:
      inscripcionActualizada.id,
    estadoInscripcion:
      inscripcionActualizada
        .estadoInscripcion,
    estadoAsistencia:
      inscripcionActualizada
        .estadoAsistencia,
    entradaRegistrada:
      inscripcionActualizada
        .entradaRegistrada,
    entradaRegistradaEn:
      inscripcionActualizada
        .entradaRegistradaEn,
    salidaRegistrada:
      inscripcionActualizada
        .salidaRegistrada,
    salidaRegistradaEn:
      inscripcionActualizada
        .salidaRegistradaEn,
    horasRegistradas:
      inscripcionActualizada
        .horasRegistradas,
  }

  return clonarDatos({
    tipo: tipoPreparado,
    actividadId:
      datosQr.actividadId,
    actividadTitulo:
      actividad.titulo,
    numeroCuenta,
    registradaEn: fechaMarcacion,
    estadoAsistencia:
      inscripcionActualizada
        .estadoAsistencia,
    situacionAsistencia:
      obtenerSituacionAsistenciaActividad(
        detalleActualizado,
        instanteActual,
      ),
    mensaje:
      obtenerMensajeMarcacionExitosa(
        tipoPreparado,
      ),
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