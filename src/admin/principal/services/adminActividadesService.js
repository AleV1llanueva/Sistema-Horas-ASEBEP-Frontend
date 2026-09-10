/*
 * Servicio de actividades del administrador principal.
 *
 * Mientras el backend administrativo no esté disponible,
 * este archivo simula sus operaciones utilizando localStorage.
 *
 * Todas las funciones públicas son asincrónicas para que,
 * cuando conectemos el backend, los componentes de React
 * no tengan que cambiar la forma en que consumen el servicio.
 */

import {
  adminPrincipalDashboardMock,
} from '../mocks/adminPrincipalMock.js'

/*
 * Clave única utilizada para guardar las actividades
 * simuladas dentro de localStorage.
 */
const CLAVE_ACTIVIDADES =
  'asebep_admin_actividades_simuladas'

// Estados que puede tener una actividad almacenada.
const ESTADOS_PERMITIDOS = [
  'programada',
  'en-curso',
  'finalizada',
  'cancelada',
]

/*
 * Tipos de marcación admitidos por el flujo de asistencia.
 * Usar constantes evita errores al comparar cadenas en las
 * funciones que generan y habilitan cada código QR.
 */
const TIPOS_MARCACION = Object.freeze({
  entrada: 'entrada',
  salida: 'salida',
})

// Entrada y salida conservan la vigencia de 10 minutos.
const DURACION_QR_MINUTOS = Object.freeze({
  [TIPOS_MARCACION.entrada]: 10,
  [TIPOS_MARCACION.salida]: 10,
})

const PREFIJO_TOKEN_QR_SIMULADO =
  'asebep-mock.'

/*
 * Cada tipo dispone de una habilitación inicial
 * y una sola reactivación.
 */
const MAXIMO_GENERACIONES_QR = 2

/*
 * Los datos administrativos simulados solo funcionan cuando:
 *
 * 1. La aplicación se ejecuta en desarrollo.
 * 2. VITE_USAR_DATOS_ADMIN_SIMULADOS contiene "true".
 *
 * En producción import.meta.env.DEV será false,
 * por lo que los mocks quedarán desactivados automáticamente.
 */
const usarDatosAdminSimulados =
  import.meta.env.DEV &&
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS === 'true'


export class ActividadAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'ActividadAdminError'
  }
}

/*
 * Impide utilizar este servicio cuando los datos simulados
 * se encuentren desactivados.
 */
function comprobarModoSimulado() {
  if (!usarDatosAdminSimulados) {
    throw new ActividadAdminError(
      'Los datos administrativos simulados están desactivados.',
    )
  }
}

/*
 * Obtiene localStorage de manera segura.
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
 - Convierte cualquier valor textual válido en una cadena
 - sin espacios innecesarios al inicio o al final.
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
 * Convierte y valida valores que obligatoriamente deben
 * ser números enteros.
 * 
 * Se utilizará para:
 * - Cupos disponibles.
 * - Horas acreditables.
 */
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

  /*
   * Algunos campos no tienen un valor máximo.
   * Por eso solamente comprobamos el máximo cuando exista.
   */
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
 * Comprueba que una fecha tenga el formato predefinido
 * y que la fecha realmente exista:
 * YYYY-MM-DD
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

  /*
   * Creamos la fecha utilizando valores locales para evitar
   * cambios accidentales provocados por zonas horarias.
   */
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
  fechaActual.setHours(0, 0, 0, 0,)

  if (fechaLocal < fechaActual) {
    throw new ActividadAdminError(
      'La fecha no puede ser anterior al dia de hoy.',
    )
  }

  return fecha
}

// Comprueba que las horas utilicen el formato de 24 horas: HH:mm

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

/*
 * Construye una fecha local a partir de los valores que usa
 * el formulario. No utilizamos Date.parse para evitar que el
 * navegador interprete la fecha en una zona horaria distinta.
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
 * Centraliza el horario utilizado para decidir si una
 * marcación puede habilitarse en el momento actual.
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

// Normaliza y comprueba el estado de una actividad.
function validarEstado(estado) {
  const estadoNormalizado =
    prepararTexto(estado).toLowerCase()

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
 * Genera un identificador único para cada actividad.
*/
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

/*
 * Cada habilitación genera un valor nuevo. De esta forma,
 * volver a habilitar una marcación invalida el token anterior
 * cuando posteriormente se compare con el almacenado.
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
 * Convierte el contenido del token a Base64 URL.
 * El prefijo permite reconocer claramente que se trata
 * de un código local de prueba y no de un token del backend.
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

  const bytes = new TextEncoder().encode(
    JSON.stringify(contenido),
  )

  let contenidoBinario = ''

  for (const byte of bytes) {
    contenidoBinario +=
      String.fromCharCode(byte)
  }

  const base64Url = btoa(
    contenidoBinario,
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

  return (
    PREFIJO_TOKEN_QR_SIMULADO +
    base64Url
  )
}

/*
 * Construye el enlace que abrirá la futura ruta
 * de registro de asistencia del estudiante.
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
 * Crea un nuevo token QR simulado.
 *
 * La generación queda incluida dentro del token
 * para distinguir la habilitación inicial de
 * su única reactivación.
 */
function crearQrSimulado({
  actividadId,
  tipo,
  ahora,
  generacion,
}) {
  const duracionMinutos =
    DURACION_QR_MINUTOS[tipo]

  if (!duracionMinutos) {
    throw new ActividadAdminError(
      'El tipo de marcación solicitado no es válido.',
    )
  }

  if (
    !Number.isInteger(generacion) ||
    generacion < 1 ||
    generacion >
      MAXIMO_GENERACIONES_QR
  ) {
    throw new ActividadAdminError(
      'La generación del código QR no es válida.',
    )
  }

  const habilitadaEn =
    ahora.toISOString()

  const expiraEn = new Date(
    ahora.getTime() +
      duracionMinutos * 60 * 1000,
  ).toISOString()

  const token = codificarTokenQrSimulado({
    version: 1,
    actividadId,
    tipo,
    generacion,
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

    habilitadaEn,
    expiraEn,
    duracionMinutos,
    generacion,
  }
}

/*
 * Recupera el último QR cuando todavía se encuentra
 * dentro de su tiempo de vigencia.
 *
 * Esta función no genera un token nuevo. Por eso,
 * cerrar y volver a abrir el diálogo conserva tanto
 * el código como el tiempo restante.
 */
function obtenerQrVigenteSimulado(
  actividad,
  tipo,
  ahora,
) {
  const esEntrada =
    tipo === TIPOS_MARCACION.entrada

  const habilitada = esEntrada
    ? actividad.entradaHabilitada ===
      true
    : actividad.salidaHabilitada ===
      true

  const habilitadaEn = prepararTexto(
    esEntrada
      ? actividad.entradaHabilitadaEn
      : actividad.salidaHabilitadaEn,
  )

  const expiraEn = prepararTexto(
    esEntrada
      ? actividad.entradaHabilitadaHasta
      : actividad.salidaHabilitadaHasta,
  )

  const token = prepararTexto(
    esEntrada
      ? actividad.tokenEntradaSimulado
      : actividad.tokenSalidaSimulado,
  )

  const generacion = Number(
    esEntrada
      ? actividad.generacionesQrEntrada
      : actividad.generacionesQrSalida,
  )

  const fechaExpiracion =
    Date.parse(expiraEn)

  const qrVigente =
    habilitada &&
    Boolean(token) &&
    Number.isFinite(fechaExpiracion) &&
    fechaExpiracion > ahora.getTime()

  if (!qrVigente) {
    return null
  }

  return {
    tipo,
    token,

    url:
      crearUrlAsistenciaSimulada(
        tipo,
        token,
      ),

    habilitadaEn:
      habilitadaEn || null,

    expiraEn,

    duracionMinutos:
      DURACION_QR_MINUTOS[tipo],

    generacion:
      Number.isInteger(generacion)
        ? generacion
        : 1,
  }
}

// Crea una copia independiente de los datos.
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

// Normaliza los contadores almacenados.
function normalizarCantidadGeneracionesQr(
  valor,
  tieneQrGuardado,
) {
  const cantidad = Number(valor)

  if (
    Number.isInteger(cantidad) &&
    cantidad >= 0
  ) {
    return Math.min(
      cantidad,
      MAXIMO_GENERACIONES_QR,
    )
  }

  return tieneQrGuardado
    ? 1
    : 0
}

/*
 * Convierte las actividades antiguas del dashboard
 * al formato completo utilizado por el módulo.
 */
function normalizarActividadInicial(
  actividad,
) {
  return {
    /*
     * Conservamos el identificador existente.
     * Si no existe, generamos uno nuevo.
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

    cuposDisponibles:
      Number.isInteger(
        Number(
          actividad.cuposDisponibles,
        ),
      )
        ? Number(
            actividad.cuposDisponibles,
          )
        : 0,

    horasAcreditables:
      Number.isInteger(
        Number(
          actividad.horasAcreditables,
        ),
      )
        ? Number(
            actividad.horasAcreditables,
          )
        : 0,

    /*
     * Unificamos estados como "En curso"
     * y "en-curso" bajo el mismo formato.
     */
    estado:
      prepararTexto(
        actividad.estado,
      )
        .toLowerCase()
        .replace(/\s+/g, '-') ||
      'programada',

    activa:
      actividad.activa !== false,

    eliminada:
      actividad.eliminada === true,

    /*
     * Configuración simulada del QR de entrada.
     *
     * El token permite comprobar posteriormente que
     * el QR leído corresponde a la última habilitación.
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

    // Conserva cuantos QR de entrada han sido generados.
    generacionesQrEntrada:
      normalizarCantidadGeneracionesQr(
        actividad.generacionesQrEntrada,

        Boolean(
          actividad.entradaHabilitada ===
            true ||
          prepararTexto(
            actividad.tokenEntradaSimulado,
          ) ||
          prepararTexto(
            actividad.entradaHabilitadaEn,
          ) ||
          prepararTexto(
            actividad.entradaHabilitadaHasta,
          ),
        ),
      ),

    /*
    * Configuración simulada del QR de salida.
    *
    * La salida tendrá una vigencia de 10 minutos,
    * igual que el QR utilizado por el backend.
    */
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

    // Conserva cuántos QR de salida han sido generados.
    generacionesQrSalida:
      normalizarCantidadGeneracionesQr(
        actividad.generacionesQrSalida,

        Boolean(
          actividad.salidaHabilitada ===
            true ||
          prepararTexto(
            actividad.tokenSalidaSimulado,
          ) ||
          prepararTexto(
            actividad.salidaHabilitadaEn,
          ) ||
          prepararTexto(
            actividad.salidaHabilitadaHasta,
          ),
        ),
      ),

    // Información de desactivación y eliminación lógica.
    desactivadaEn:
      prepararTexto(
        actividad.desactivadaEn,
      ) || null,

    eliminadaEn:
      prepararTexto(
        actividad.eliminadaEn,
      ) || null,

    // Estas fechas permiten conocer cuándo se creó y cuándo se modificó la actividad.
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

/*
 * Guarda el arreglo completo de actividades
 * dentro de localStorage.
 */
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
    /*
     * Este error también puede ocurrir si localStorage
     * supera su espacio máximo permitido.
     */
    throw new ActividadAdminError(
      'No fue posible guardar las actividades en el navegador.',
    )
  }
}

/*
 * Recupera las actividades almacenadas.
*/
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
     * null significa que la clave todavía no existe.
     * Esto ocurre normalmente durante el primer ingreso.
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

    /*
     * La información debe ser siempre un arreglo.
     * Si localStorage contiene otro tipo de dato,
     * lo consideramos información dañada.
    */
    if (!Array.isArray(actividades)) {
      throw new Error()
    }

    return actividades.map(
      normalizarActividadInicial,
    )
  } catch (error) {
    /*
     * Si el error ya fue creado por nuestro servicio,
     * lo conservamos sin reemplazar su mensaje.
     */
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

/*
 * Valida todos los datos necesarios para crear
 * o actualizar una actividad.
 *
 * Esta función funciona como una frontera de seguridad:
 * ninguna actividad se guarda sin pasar primero por aquí.
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

  /*
   * Primero normalizamos los campos de texto.
   */
  const titulo = prepararTexto(
    datos.titulo,
  )

  const descripcion = prepararTexto(
    datos.descripcion,
  )

  const lugar = prepararTexto(
    datos.lugar,
  )

  /*
   * Comprobamos los campos obligatorios antes de procesar
   * fechas, horas y cantidades.
   */
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

  /*
   * Validamos la fecha y las dos horas por separado.
   */
  const fecha = validarFecha(
    prepararTexto(datos.fecha),
  )

  const horaInicio = validarHora(
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

  /*
   * Como utilizamos HH:mm, podemos comparar las cadenas
   * directamente mientras ambas tengan el mismo formato.
   */
  if (
    horaFinalizacion <= horaInicio
  ) {
    throw new ActividadAdminError(
      'La hora de finalización debe ser posterior a la hora de inicio.',
    )
  }

  /*
   * Los cupos deben ser un número entero mayor que cero.
   */
  const cuposDisponibles =
    prepararEntero(
      datos.cuposDisponibles,
      'Los cupos disponibles',
      1,
    )

  /*
   * Las horas acreditables deben encontrarse entre 1 y 100,
   * siguiendo la validación mostrada en la referencia.
   */
  const horasAcreditables =
    prepararEntero(
      datos.horasAcreditables,
      'Las horas acreditables',
      1,
      100,
    )

  /*
   * Devolvemos únicamente información normalizada.
   * Así evitamos guardar propiedades desconocidas enviadas
   * accidentalmente desde el formulario.
   */
  return {
    titulo,
    descripcion,
    fecha,
    horaInicio,
    horaFinalizacion,
    lugar,
    cuposDisponibles,
    horasAcreditables,

    estado: validarEstado(
      datos.estado ??
        estadoPredeterminado,
    ),
  }
}

/*
 * Ordena las actividades desde la más próxima
 * hasta la más lejana.
 *
 * Combinamos fecha y hora para que dos actividades del mismo
 * día aparezcan ordenadas según su hora de inicio.
 */
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

// Devuelve todas las actividades simuladas.
export async function listarActividades() {
  comprobarModoSimulado()

  const actividades =
    leerActividades().filter(
        (actividad) => actividad.eliminada !== true,
    )

  return clonarDatos(
    ordenarActividades(actividades),
  )
}

// Busca una actividad mediante su identificador.
// Devuelve null si la actividad no existe.

export async function obtenerActividad(
  identificador,
) {
  comprobarModoSimulado()

  const id = prepararTexto(
    identificador,
  )

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const actividad =
    leerActividades().find(
      (elemento) =>
        elemento.id === id && elemento.eliminada !== true,
    )

  return actividad
    ? clonarDatos(actividad)
    : null
}

/*
 * Muestra el QR vigente o genera uno nuevo cuando
 * el anterior ya terminó.
 *
 * Cada tipo dispone de dos generaciones independientes:
 * una habilitación inicial y una reactivación.
 */
async function habilitarMarcacionActividad(
  identificador,
  tipoSolicitado,
) {
  comprobarModoSimulado()

  const id = prepararTexto(
    identificador,
  )

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const tipo = prepararTexto(
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
      'La actividad que deseas habilitar no existe.',
    )
  }

  const actividadActual =
    actividades[indiceActividad]

  if (actividadActual.activa === false) {
    throw new ActividadAdminError(
      'No puedes habilitar la asistencia de una actividad desactivada.',
    )
  }

  const estadoActual =
    prepararTexto(
      actividadActual.estado,
    )
      .toLowerCase()
      .replace(/\s+/g, '-')

  if (estadoActual === 'cancelada') {
    throw new ActividadAdminError(
      'No puedes habilitar la asistencia de una actividad cancelada.',
    )
  }

  if (estadoActual === 'finalizada') {
    throw new ActividadAdminError(
      'No puedes habilitar la asistencia de una actividad finalizada.',
    )
  }

  const ahora = new Date()

  /*
   * Antes de generar otro token comprobamos si existe
   * uno vigente. Si existe, devolvemos exactamente el
   * mismo QR y su fecha de expiración original.
   */
  const qrVigente =
    obtenerQrVigenteSimulado(
      actividadActual,
      tipo,
      ahora,
    )

  const generacionesActuales =
    tipo === TIPOS_MARCACION.entrada
      ? actividadActual
          .generacionesQrEntrada
      : actividadActual
          .generacionesQrSalida

  if (qrVigente) {
    return clonarDatos({
      actividad:
        actividadActual,

      qr: qrVigente,

      reutilizado: true,

      generacionesRestantes:
        Math.max(
          0,
          MAXIMO_GENERACIONES_QR -
            generacionesActuales,
        ),
    })
  }

  const {
    inicio,
    finalizacion,
  } = obtenerHorarioActividad(
    actividadActual,
  )

  if (!inicio || !finalizacion) {
    throw new ActividadAdminError(
      'No fue posible comprobar el horario de la actividad.',
    )
  }

  if (
    ahora.getTime() <
    inicio.getTime()
  ) {
    throw new ActividadAdminError(
      tipo === TIPOS_MARCACION.entrada
        ? 'La entrada podrá habilitarse cuando comience la actividad.'
        : 'La salida no puede habilitarse antes de que comience la actividad.',
    )
  }

  if (
    tipo === TIPOS_MARCACION.entrada &&
    ahora.getTime() >=
      finalizacion.getTime()
  ) {
    throw new ActividadAdminError(
      'La entrada no puede habilitarse porque la actividad ya terminó.',
    )
  }

/*
 * Si ya se utilizaron las dos oportunidades,
 * impedimos generar codigos extra.
*/
  if (
    generacionesActuales >=
    MAXIMO_GENERACIONES_QR
  ) {
    throw new ActividadAdminError(
      tipo === TIPOS_MARCACION.entrada
        ? 'La entrada ya utilizó su generación inicial y su única reactivación.'
        : 'La salida ya utilizó su generación inicial y su única reactivación.',
    )
  }

  const nuevaGeneracion =
    generacionesActuales + 1

  const qr = crearQrSimulado({
    actividadId: id,
    tipo,
    ahora,
    generacion:
      nuevaGeneracion,
  })

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

          generacionesQrEntrada:
            nuevaGeneracion,
        }
      : {
          salidaHabilitada: true,

          salidaHabilitadaEn:
            qr.habilitadaEn,

          salidaHabilitadaHasta:
            qr.expiraEn,

          tokenSalidaSimulado:
            qr.token,

          generacionesQrSalida:
            nuevaGeneracion,
        }

  const actividadActualizada = {
    ...actividadActual,
    ...camposMarcacion,

    /*
     * La primera habilitación confirma que la
     * actividad se encuentra operativamente en curso.
     */
    estado:
      estadoActual === 'programada'
        ? 'en-curso'
        : estadoActual,

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

    reutilizado: false,

    generacionesRestantes:
      MAXIMO_GENERACIONES_QR -
      nuevaGeneracion,
  })
}

/*
 * Abre el QR de entrada durante 10 minutos.
 */
export async function habilitarEntradaActividad(
  identificador,
) {
  return habilitarMarcacionActividad(
    identificador,
    TIPOS_MARCACION.entrada,
  )
}

/*
 * Abre el QR de salida durante los 10 minutos acordados.
 */
export async function habilitarSalidaActividad(
  identificador,
) {
  return habilitarMarcacionActividad(
    identificador,
    TIPOS_MARCACION.salida,
  )
}

/*
 * Crea y publica una nueva actividad.
*/
export async function crearActividad(
  datos,
) {
  comprobarModoSimulado()

  const datosPreparados =
    prepararDatosActividad(
      {
        ...datos,
        estado: 'programada',
      },
      'programada',
    )

  const fechaActual =
    new Date().toISOString()

  const nuevaActividad = {
    id: crearIdentificador(),
    ...datosPreparados,

    estado: 'programada',
    activa: true,
    eliminada: false,

    /*
     * Una actividad recién creada todavía no tiene
     * habilitada ninguna marcación de asistencia.
     */
    entradaHabilitada: false,
    entradaHabilitadaEn: null,
    entradaHabilitadaHasta: null,
    tokenEntradaSimulado: null,
    generacionesQrEntrada: 0,

    salidaHabilitada: false,
    salidaHabilitadaEn: null,
    salidaHabilitadaHasta: null,
    tokenSalidaSimulado: null,
    generacionesQrSalida: 0,

    /*
     * Estos valores se completarán si la actividad
     * se desactiva o se elimina posteriormente.
     */
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

/*
 * Actualiza una actividad existente.
*/
export async function actualizarActividad(
  identificador,
  cambios,
) {
  comprobarModoSimulado()

  const id = prepararTexto(
    identificador,
  )

  if (!id) {
    throw new ActividadAdminError(
      'El identificador de la actividad es obligatorio.',
    )
  }

  const actividades =
    leerActividades()

  const indiceActividad =
    actividades.findIndex(
      (actividad) =>
        actividad.id === id,
    )

  if (indiceActividad === -1) {
    throw new ActividadAdminError(
      'La actividad que deseas actualizar no existe.',
    )
  }

  const actividadActual =
    actividades[indiceActividad]

  /*
   * Combinamos la información actual con los cambios.
   * Después validamos nuevamente todos los campos.
   */
  const datosPreparados =
    prepararDatosActividad({
      ...actividadActual,
      ...cambios,
    })

  const actividadActualizada = {
    ...actividadActual,
    ...datosPreparados,
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
* Oculta una actividad sin borrarla fisicamente.
*/
export async function eliminarActividad(
    identificador,
) {
    comprobarModoSimulado()
    const id = prepararTexto(
        identificador,
    )

    if (!id) {
        throw new ActividadAdminError(
            'El identificador de la actividad es obligatorio.',
        )
    }

    const actividades = leerActividades()
    const indiceActividad = actividades.findIndex(
        (actividad) =>
            actividad.id === id && actividad.eliminada !== true,
    )

    if (indiceActividad === -1) {
        throw new ActividadAdminError(
            'La actividad que deseas eliminar no existe.',
        )
    }

    const fechaActual = new Date().toISOString()
    const actividadEliminada = {
        ...actividades[indiceActividad],
        activa: false,
        eliminada: true,
        eliminadaEn: fechaActual,
        actualizadaEn: fechaActual,
    }

    actividades[indiceActividad] = actividadEliminada
    
    guardarActividades(
        actividades,
    )

    return clonarDatos(
        actividadEliminada,
    )
}


/*
 * Elimina los cambios realizados durante las pruebas
 * y restaura las actividades originales del mock.
 *
 * Esta función podrá utilizarse desde DevTools o desde
 * una herramienta de pruebas durante el desarrollo.
 */
export async function restablecerActividades() {
  comprobarModoSimulado()

  const actividadesIniciales =
    obtenerActividadesIniciales()

  guardarActividades(
    actividadesIniciales,
  )

  return clonarDatos(
    actividadesIniciales,
  )
}
