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

/*
 * Comprueba que las horas utilicen el formato de 24 horas:
 * HH:mm
*/
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

// Crea una copia independiente de los datos.
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Convierte las actividades antiguas del dashboard al nuevo
 * formato completo utilizado por el módulo de actividades.
*/
function normalizarActividadInicial(
  actividad,
) {
  return {
    /*
     - Conservamos el identificador existente.
     - Si no existe, generamos uno nuevo.
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

    estado:
      prepararTexto(
        actividad.estado,
      ).toLowerCase() || 'programada',

      activa: actividad.activa !== false,

      eliminada: actividad.eliminada === true,

      desactivadaEn: prepararTexto(
        actividad.desactivadaEn,
      ) || null,

      eliminadaEn: prepararTexto(
        actividad.eliminadaEn,
      ) || null,

    /*
     - Estas fechas permiten conocer cuándo se creó
     - y cuándo se modificó una actividad.
    */
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
