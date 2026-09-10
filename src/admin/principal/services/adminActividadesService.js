import { apiFetch, ApiError } from '../../../services/api.js'

/*
 * Servicio de actividades del administrador principal.
 *
 * Permite alternar entre el backend real (vía fetch) y la simulación
 * local utilizando localStorage cuando VITE_USAR_DATOS_ADMIN_SIMULADOS es true.
 */

import { adminPrincipalDashboardMock } from '../mocks/adminPrincipalMock.js'

// Clave única utilizada para guardar las actividades simuladas en localStorage.
const CLAVE_ACTIVIDADES = 'asebep_admin_actividades_simuladas'


// Estados que puede tener una actividad almacenada.
const ESTADOS_PERMITIDOS = [
  'programada',
  'en-curso',
  'finalizada',
  'cancelada',
]

/*
 * Los datos administrativos simulados solo funcionan cuando:
 * 1. La aplicación se ejecuta en desarrollo.
 * 2. VITE_USAR_DATOS_ADMIN_SIMULADOS contiene "true".
 */
const usarDatosAdminSimulados =
  import.meta.env.DEV &&
  import.meta.env.VITE_USAR_DATOS_ADMIN_SIMULADOS === 'true'

export class ActividadAdminError extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = 'ActividadAdminError'
  }
}

// Traduce el formato del backend (snake_case) al formato interno (camelCase)
function normalizarActividadBackend(actividad) {
  return normalizarActividadInicial({
    id: actividad.id,
    titulo: actividad.titulo,
    descripcion: actividad.descripcion,
    lugar: actividad.ubicacion,
    fecha: actividad.fecha_actividad,
    horaInicio: actividad.hora_inicio,
    horaFinalizacion: actividad.hora_final,
    cuposDisponibles: actividad.cupos_disponibles,
    horasAcreditables: actividad.horas_asignar,
    estado: actividad.estado,
    activa: actividad.activa,
    eliminada: actividad.eliminada,
  })
}

/*
 * Helper para realizar peticiones HTTP al backend real.
 */
async function peticionApi(endpoint, opciones = {}) {
  try {
    return await apiFetch(endpoint, opciones)
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ActividadAdminError(error.message)
    }
    throw new ActividadAdminError('No se pudo conectar con el servidor backend.')
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

function prepararTexto(valor) {
  if (valor === null || valor === undefined) {
    return ''
  }
  return String(valor).trim()
}

function prepararEntero(valor, nombreCampo, minimo, maximo = null) {
  const numero = Number(valor)

  if (!Number.isInteger(numero)) {
    throw new ActividadAdminError(`${nombreCampo} debe ser un número entero.`)
  }

  if (numero < minimo) {
    throw new ActividadAdminError(`${nombreCampo} debe ser mayor o igual a ${minimo}.`)
  }

  if (maximo !== null && numero > maximo) {
    throw new ActividadAdminError(`${nombreCampo} debe ser menor o igual a ${maximo}.`)
  }

  return numero
}

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new ActividadAdminError('La fecha de la actividad no es válida.')
  }

  const [anio, mes, dia] = fecha.split('-').map(Number)

  const fechaLocal = new Date(anio, mes - 1, dia)

  const fechaValida =
    fechaLocal.getFullYear() === anio &&
    fechaLocal.getMonth() === mes - 1 &&
    fechaLocal.getDate() === dia

  if (!fechaValida) {
    throw new ActividadAdminError('La fecha de la actividad no existe.')
  }

  const fechaActual = new Date()
  fechaActual.setHours(0, 0, 0, 0)

  if (fechaLocal < fechaActual) {
    throw new ActividadAdminError('La fecha no puede ser anterior al día de hoy.')
  }

  return fecha
}

function validarHora(hora, nombreCampo) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    throw new ActividadAdminError(`${nombreCampo} no tiene un formato válido.`)
  }

  return hora
}

function validarEstado(estado) {
  const estadoNormalizado = prepararTexto(estado).toLowerCase()

  if (!ESTADOS_PERMITIDOS.includes(estadoNormalizado)) {
    throw new ActividadAdminError('El estado de la actividad no es válido.')
  }

  return estadoNormalizado
}

function crearIdentificador() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `actividad-${crypto.randomUUID()}`
  }

  return `actividad-${Date.now()}-` + Math.random().toString(16).slice(2)
}

function clonarDatos(datos) {
  return JSON.parse(JSON.stringify(datos))
}

function normalizarActividadInicial(actividad) {
  return {
    id: prepararTexto(actividad.id) || crearIdentificador(),
    titulo: prepararTexto(actividad.titulo ?? actividad.nombre),
    descripcion: prepararTexto(actividad.descripcion),
    fecha: prepararTexto(actividad.fecha),
    horaInicio: prepararTexto(actividad.horaInicio ?? actividad.hora),
    horaFinalizacion: prepararTexto(actividad.horaFinalizacion),
    lugar: prepararTexto(actividad.lugar),
    cuposDisponibles: Number.isInteger(Number(actividad.cuposDisponibles))
      ? Number(actividad.cuposDisponibles)
      : 0,
    horasAcreditables: Number.isInteger(Number(actividad.horasAcreditables))
      ? Number(actividad.horasAcreditables)
      : 0,
    imagen: actividad.imagen ?? null,
    estado: prepararTexto(actividad.estado).toLowerCase() || 'programada',
    activa: actividad.activa !== false,
    eliminada: actividad.eliminada === true,
    desactivadaEn: prepararTexto(actividad.desactivadaEn) || null,
    eliminadaEn: prepararTexto(actividad.eliminadaEn) || null,
    creadaEn: prepararTexto(actividad.creadaEn) || null,
    actualizadaEn: prepararTexto(actividad.actualizadaEn) || null,
  }
}

function obtenerActividadesIniciales() {
  const actividades = adminPrincipalDashboardMock.proximasActividades

  if (!Array.isArray(actividades)) {
    return []
  }

  return actividades.map(normalizarActividadInicial)
}

function guardarActividades(actividades) {
  const almacenamiento = obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError('El almacenamiento local no está disponible.')
  }

  try {
    almacenamiento.setItem(CLAVE_ACTIVIDADES, JSON.stringify(actividades))
  } catch {
    throw new ActividadAdminError('No fue posible guardar las actividades en el navegador.')
  }
}

function leerActividades() {
  const almacenamiento = obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new ActividadAdminError('El almacenamiento local no está disponible.')
  }

  try {
    const contenido = almacenamiento.getItem(CLAVE_ACTIVIDADES)

    if (contenido === null) {
      const actividadesIniciales = obtenerActividadesIniciales()
      guardarActividades(actividadesIniciales)
      return actividadesIniciales
    }

    const actividades = JSON.parse(contenido)

    if (!Array.isArray(actividades)) {
      throw new Error()
    }

    return actividades.map(normalizarActividadInicial)
  } catch (error) {
    if (error instanceof ActividadAdminError) {
      throw error
    }

    throw new ActividadAdminError('Las actividades almacenadas no tienen un formato válido.')
  }
}

function prepararDatosActividad(datos, estadoPredeterminado = 'programada') {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ActividadAdminError('La información de la actividad no es válida.')
  }

  const titulo = prepararTexto(datos.titulo)
  const descripcion = prepararTexto(datos.descripcion)
  const lugar = prepararTexto(datos.lugar)

  if (!titulo) {
    throw new ActividadAdminError('El título de la actividad es obligatorio.')
  }

  if (titulo.length > 120) {
    throw new ActividadAdminError('El título no puede superar los 120 caracteres.')
  }

  if (!descripcion) {
    throw new ActividadAdminError('La descripción de la actividad es obligatoria.')
  }

  if (descripcion.length > 500) {
    throw new ActividadAdminError('La descripción no puede superar los 500 caracteres.')
  }

  if (!lugar) {
    throw new ActividadAdminError('El lugar de la actividad es obligatorio.')
  }

  const fecha = validarFecha(prepararTexto(datos.fecha))

  const horaInicio = validarHora(
    prepararTexto(datos.horaInicio),
    'La hora de inicio',
  )

  const horaFinalizacion = validarHora(
    prepararTexto(datos.horaFinalizacion),
    'La hora de finalización',
  )

  if (horaFinalizacion <= horaInicio) {
    throw new ActividadAdminError(
      'La hora de finalización debe ser posterior a la hora de inicio.',
    )
  }

  const cuposDisponibles = prepararEntero(
    datos.cuposDisponibles,
    'Los cupos disponibles',
    1,
  )

  const horasAcreditables = prepararEntero(
    datos.horasAcreditables,
    'Las horas acreditables',
    1,
    100,
  )

  const datos_reconstruidos = {
    titulo: titulo,
    descripcion: descripcion,
    ubicacion: lugar,
    horas_asignar: horasAcreditables,
    hora_inicio: horaInicio,
    hora_final: horaFinalizacion,
    cupos: cuposDisponibles,
    fecha_actividad: fecha
  }

  return datos_reconstruidos
}

function ordenarActividades(actividades) {
  return [...actividades].sort((actividadA, actividadB) => {
    const fechaHoraA = `${actividadA.fecha}T${actividadA.horaInicio}`
    const fechaHoraB = `${actividadB.fecha}T${actividadB.horaInicio}`

    return fechaHoraA.localeCompare(fechaHoraB)
  })
}

// --- FUNCIONES PÚBLICAS EXPORTADAS ---

// Devuelve todas las actividades.
export async function listarActividades() {
  if (usarDatosAdminSimulados) {
    const actividades = leerActividades().filter(
      (actividad) => actividad.eliminada !== true,
    )
    return clonarDatos(ordenarActividades(actividades))
  }

  const actividades = await peticionApi('/actividades')
  return Array.isArray(actividades)
    ? actividades.map(normalizarActividadBackend)
    : []
}

export async function obtenerActividad(identificador) {
  const id = prepararTexto(identificador)
  if (!id) {
    throw new ActividadAdminError('El identificador de la actividad es obligatorio.')
  }

  if (usarDatosAdminSimulados) {
    const actividad = leerActividades().find(
      (elemento) => elemento.id === id && elemento.eliminada !== true,
    )
    return actividad ? clonarDatos(actividad) : null
  }

  const actividad = await peticionApi(`/actividades/${id}`)
  return actividad ? normalizarActividadBackend(actividad) : null
}

// Crea y publica una nueva actividad.
export async function crearActividad(datos) {
  const datosPreparados = prepararDatosActividad(datos)

  if (usarDatosAdminSimulados) {
    const fechaActual = new Date().toISOString()
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

    const actividades = leerActividades()
    actividades.push(nuevaActividad)
    guardarActividades(actividades)

    return clonarDatos(nuevaActividad)
  }

  console.log(datosPreparados)

  return peticionApi('/actividades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datosPreparados),
  })
}

// Actualiza una actividad existente.
export async function actualizarActividad(identificador, cambios) {
  const id = prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError('El identificador de la actividad es obligatorio.')
  }

  if (usarDatosAdminSimulados) {
    const actividades = leerActividades()
    const indiceActividad = actividades.findIndex((actividad) => actividad.id === id)

    if (indiceActividad === -1) {
      throw new ActividadAdminError('La actividad que deseas actualizar no existe.')
    }

    const actividadActual = actividades[indiceActividad]
    const datosPreparados = prepararDatosActividad({
      ...actividadActual,
      ...cambios,
    })

    const actividadActualizada = {
      ...actividadActual,
      ...datosPreparados,
      id: actividadActual.id,
      creadaEn: actividadActual.creadaEn,
      actualizadaEn: new Date().toISOString(),
    }

    actividades[indiceActividad] = actividadActualizada
    guardarActividades(actividades)

    return clonarDatos(actividadActualizada)
  }

  // Si usa la API real, enviamos solo los cambios
  return peticionApi(`/actividades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(cambios),
  })
}

// Oculta/elimina una actividad.
export async function eliminarActividad(identificador) {
  const id = prepararTexto(identificador)

  if (!id) {
    throw new ActividadAdminError('El identificador de la actividad es obligatorio.')
  }

  if (usarDatosAdminSimulados) {
    const actividades = leerActividades()
    const indiceActividad = actividades.findIndex(
      (actividad) => actividad.id === id && actividad.eliminada !== true,
    )

    if (indiceActividad === -1) {
      throw new ActividadAdminError('La actividad que deseas eliminar no existe.')
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
    guardarActividades(actividades)

    return clonarDatos(actividadEliminada)
  }

  return peticionApi(`/actividades/${id}`, {
    method: 'DELETE',
  })
}

// Restaura las actividades originales del mock (solo en modo simulado).
export async function restablecerActividades() {
  if (!usarDatosAdminSimulados) {
    throw new ActividadAdminError('Restablecer solo es válido en modo simulado.')
  }

  const actividadesIniciales = obtenerActividadesIniciales()
  guardarActividades(actividadesIniciales)

  return clonarDatos(actividadesIniciales)
}
