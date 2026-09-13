import {
  ApiError,
  apiFetch,
} from '../../../services/api.js'

import {
  ESTADOS_APORTACION_BACKEND,
  usuarioMock,
} from '../../../mocks/usuarioMock.js'

/*
 * Servicio administrativo de aportaciones.
 *
 * true  -> usuario mock y localStorage.
 * false -> backend.
 */

const CLAVE_APORTACIONES_SIMULADAS =
  'asebep_aportaciones_simuladas_v1'

const usarDatosAdminSimulados =
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS ===
  'true'

/*
 * Reexportamos los estados para que las páginas
 * no dependan directamente del archivo mock.
 */
export const ESTADOS_APORTACION =
  ESTADOS_APORTACION_BACKEND

// Error propio del módulo administrativo.
export class AportacionAdminError
  extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'AportacionAdminError'
  }
}

// Funciones generales del servicio.
function esObjeto(valor) {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  )
}

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
 * Crea una copia independiente para evitar
 * modificaciones accidentales de los datos.
 */
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Valida el identificador numérico utilizado
 * por el backend.
 */
function prepararIdentificador(valor) {
  const identificador = Number(valor)

  if (
    !Number.isInteger(identificador) ||
    identificador <= 0
  ) {
    throw new AportacionAdminError(
      'La aportación tiene un identificador inválido.',
    )
  }

  return identificador
}

/*
 * Valida cantidades enteras que no pueden
 * ser menores que cero.
 */
function prepararEnteroNoNegativo(
  valor,
  nombreCampo,
) {
  const numero = Number(valor)

  if (
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    throw new AportacionAdminError(
      `${nombreCampo} debe ser un número entero mayor o igual a cero.`,
    )
  }

  return numero
}

/*
 * Convierte posibles variantes visuales al valor
 * exacto reconocido por el backend.
 */
function normalizarEstado(valor) {
  const estado =
    prepararTexto(valor)
      .toLocaleLowerCase('es')

  const equivalencias = {
    pendiente:
      ESTADOS_APORTACION.PENDIENTE,

    aprobado:
      ESTADOS_APORTACION.APROBADO,

    aprobada:
      ESTADOS_APORTACION.APROBADO,

    rechazado:
      ESTADOS_APORTACION.RECHAZADO,

    rechazada:
      ESTADOS_APORTACION.RECHAZADO,
  }

  const estadoNormalizado =
    equivalencias[estado]

  if (!estadoNormalizado) {
    throw new AportacionAdminError(
      `El estado "${prepararTexto(valor)}" no pertenece al contrato de aportaciones.`,
    )
  }

  return estadoNormalizado
}

/*
 * Comprueba que fecha_subida pueda
 * interpretarse correctamente.
 */
function normalizarFechaSubida(valor) {
  const fechaSubida =
    prepararTexto(valor)

  if (
    !fechaSubida ||
    Number.isNaN(
      Date.parse(fechaSubida),
    )
  ) {
    throw new AportacionAdminError(
      'Una aportación contiene una fecha de subida inválida.',
    )
  }

  return fechaSubida
}

/*
 * Normaliza únicamente los campos definidos
 * por AportacionResponse en el backend.
 */
function normalizarAportacion(
  aportacion,
) {
  if (!esObjeto(aportacion)) {
    throw new AportacionAdminError(
      'Una aportación tiene un formato inválido.',
    )
  }

  const numeroCuenta =
    prepararTexto(
      aportacion.num_cuenta,
    )

  const numeroReferencia =
    prepararTexto(
      aportacion.num_referencia,
    )

  const rutaPdf =
    prepararTexto(
      aportacion.ruta_pdf,
    )

  if (!numeroCuenta) {
    throw new AportacionAdminError(
      'Una aportación no contiene número de cuenta.',
    )
  }

  if (!numeroReferencia) {
    throw new AportacionAdminError(
      'Una aportación no contiene número de referencia.',
    )
  }

  if (!rutaPdf) {
    throw new AportacionAdminError(
      'Una aportación no contiene la ruta de su comprobante.',
    )
  }

  return {
    id:
      prepararIdentificador(
        aportacion.id,
      ),

    num_cuenta: numeroCuenta,

    num_referencia:
      numeroReferencia,

    descripcion:
      prepararTexto(
        aportacion.descripcion,
      ) || null,

    ruta_pdf: rutaPdf,

    estado:
      normalizarEstado(
        aportacion.estado,
      ),

    /*
     * El listado actual del backend puede omitir este
     * campo y el esquema lo completa con cero.
     */
    meses_aprobados:
      prepararEnteroNoNegativo(
        aportacion.meses_aprobados ?? 0,
        'Los meses aprobados',
      ),

    fecha_subida:
      normalizarFechaSubida(
        aportacion.fecha_subida,
      ),
  }
}

/*
 * Valida el cuerpo permitido por
 * RevisionAportacionInput.
 */
function normalizarRevision(
  revision,
) {
  if (!esObjeto(revision)) {
    throw new AportacionAdminError(
      'La revisión indicada no es válida.',
    )
  }

  const estado =
    normalizarEstado(
      revision.estado,
    )

  if (
    estado !==
      ESTADOS_APORTACION.APROBADO &&
    estado !==
      ESTADOS_APORTACION.RECHAZADO
  ) {
    throw new AportacionAdminError(
      'Una aportación solamente puede aprobarse o rechazarse.',
    )
  }

  /*
   * Al rechazar siempre se envía cero.
   *
   * Al aprobar, el backend exige una cantidad
   * de meses mayor que cero.
   */
  const mesesAprobados =
    estado ===
    ESTADOS_APORTACION.RECHAZADO
      ? 0
      : prepararEnteroNoNegativo(
          revision.meses_aprobados ?? 0,
          'Los meses aprobados',
        )

  if (
    estado ===
      ESTADOS_APORTACION.APROBADO &&
    mesesAprobados <= 0
  ) {
    throw new AportacionAdminError(
      'Debes indicar al menos un mes para aprobar la aportación.',
    )
  }

  return {
    estado,
    meses_aprobados:
      mesesAprobados,
  }
}

/*
 * Obtiene el nombre completo desde un usuario
 * simulado o desde GET /usuarios.
 */
function normalizarIdentidadEstudiante(
  usuario,
) {
  if (!esObjeto(usuario)) {
    return null
  }

  const datosPersonales =
    esObjeto(usuario.datosPersonales)
      ? usuario.datosPersonales
      : esObjeto(
          usuario.datos_personales,
        )
        ? usuario.datos_personales
        : {}

  const numeroCuenta =
    prepararTexto(
      datosPersonales.numeroCuenta ??
        datosPersonales.num_cuenta ??
        usuario.numeroCuenta ??
        usuario.num_cuenta,
    )

  if (!numeroCuenta) {
    return null
  }

  const primerNombre =
    prepararTexto(
      datosPersonales.primerNombre ??
        datosPersonales.p_nombre,
    )

  const segundoNombre =
    prepararTexto(
      datosPersonales.segundoNombre ??
        datosPersonales.s_nombre,
    )

  const primerApellido =
    prepararTexto(
      datosPersonales.primerApellido ??
        datosPersonales.p_apellido,
    )

  const segundoApellido =
    prepararTexto(
      datosPersonales.segundoApellido ??
        datosPersonales.s_apellido,
    )

  const nombreCompleto =
    prepararTexto(
      datosPersonales.nombreCompleto ??
        datosPersonales.nombre_completo,
    ) ||
    [
      primerNombre,
      segundoNombre,
      primerApellido,
      segundoApellido,
    ]
      .filter(Boolean)
      .join(' ')

  return {
    num_cuenta: numeroCuenta,

    nombre_completo:
      nombreCompleto || null,
  }
}

/*
 * Relaciona cada aportación con el estudiante
 * correspondiente mediante num_cuenta.
 */
function relacionarAportacionesConEstudiantes(
  aportaciones,
  estudiantes,
) {
  const estudiantesPorCuenta =
    new Map(
      estudiantes
        .filter(Boolean)
        .map(
          (estudiante) => [
            estudiante.num_cuenta,
            estudiante,
          ],
        ),
    )

  return aportaciones.map(
    (aportacion) => ({
      aportacion,

      estudiante:
        estudiantesPorCuenta.get(
          aportacion.num_cuenta,
        ) ?? {
          num_cuenta:
            aportacion.num_cuenta,

          nombre_completo: null,
        },
    }),
  )
}

/*
 * Ordena primero las aportaciones
 * enviadas más recientemente.
 */
function ordenarAportaciones(
  registros,
) {
  return [...registros].sort(
    (registroA, registroB) => {
      const fechaA =
        Date.parse(
          registroA
            .aportacion
            .fecha_subida,
        )

      const fechaB =
        Date.parse(
          registroB
            .aportacion
            .fecha_subida,
        )

      if (fechaA !== fechaB) {
        return fechaB - fechaA
      }

      return (
        registroB.aportacion.id -
        registroA.aportacion.id
      )
    },
  )
}

// Almacenamiento del modo simulado.
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
 * Obtiene las aportaciones iniciales
 * declaradas dentro del usuario mock.
 */
function obtenerAportacionesIniciales() {
  if (
    !Array.isArray(
      usuarioMock.aportaciones,
    )
  ) {
    throw new AportacionAdminError(
      'El usuario mock no contiene una lista válida de aportaciones.',
    )
  }

  return usuarioMock.aportaciones.map(
    normalizarAportacion,
  )
}

// Guarda exclusivamente las aportaciones.
function guardarAportacionesSimuladas(
  aportaciones,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    return
  }

  try {
    almacenamiento.setItem(
      CLAVE_APORTACIONES_SIMULADAS,
      JSON.stringify(aportaciones),
    )
  } catch {
    throw new AportacionAdminError(
      'No fue posible guardar las aportaciones simuladas en el navegador.',
    )
  }
}

/*
 * Lee localStorage y utiliza el usuario mock
 * cuando todavía no existen datos guardados.
 */
function leerAportacionesSimuladas() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    return obtenerAportacionesIniciales()
  }

  let contenido

  try {
    contenido =
      almacenamiento.getItem(
        CLAVE_APORTACIONES_SIMULADAS,
      )
  } catch {
    throw new AportacionAdminError(
      'No fue posible consultar las aportaciones simuladas.',
    )
  }

  if (contenido === null) {
    const aportacionesIniciales =
      obtenerAportacionesIniciales()

    guardarAportacionesSimuladas(
      aportacionesIniciales,
    )

    return aportacionesIniciales
  }

  let aportacionesGuardadas

  try {
    aportacionesGuardadas =
      JSON.parse(contenido)
  } catch {
    throw new AportacionAdminError(
      'Las aportaciones guardadas tienen un formato JSON inválido.',
    )
  }

  if (!Array.isArray(aportacionesGuardadas)) {
    throw new AportacionAdminError(
      'Las aportaciones guardadas no contienen una lista válida.',
    )
  }

  return aportacionesGuardadas.map(
    normalizarAportacion,
  )
}

/*
 * Actualiza una aportación dentro
 * del almacenamiento simulado.
 */
function revisarAportacionSimulada(
  aportacionId,
  revision,
) {
  const aportaciones =
    leerAportacionesSimuladas()

  const indiceAportacion =
    aportaciones.findIndex(
      (aportacion) =>
        aportacion.id ===
        aportacionId,
    )

  if (indiceAportacion === -1) {
    throw new AportacionAdminError(
      'La aportación que deseas revisar no existe.',
    )
  }

  const aportacionActual =
    aportaciones[indiceAportacion]

  /*
   * Las decisiones son finales.
   *
   * Esta segunda comprobación evita modificar un registro
   * que haya cambiado después de abrir el detalle.
   */
  if (
    aportacionActual.estado !==
    ESTADOS_APORTACION.PENDIENTE
  ) {
    throw new AportacionAdminError(
      'Esta aportación ya fue revisada y no puede modificarse nuevamente.',
    )
  }

  aportaciones[indiceAportacion] = {
    ...aportacionActual,
    estado: revision.estado,

    meses_aprobados:
      revision.meses_aprobados,
  }

  guardarAportacionesSimuladas(
    aportaciones,
  )
}

/* Consumo protegido del backend. */

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
      throw new AportacionAdminError(
        error.message,
      )
    }

    throw new AportacionAdminError(
      'No fue posible conectar con el servidor de aportaciones.',
    )
  }
}

/*
 * Obtiene las aportaciones y los estudiantes
 * utilizando los contratos actuales del backend.
 */
async function listarAportacionesBackend() {
  const [
    aportacionesRecibidas,
    estudiantesRecibidos,
  ] = await Promise.all([
    peticionApi(
      '/aportaciones/pendientes',
    ),

    peticionApi('/usuarios'),
  ])

  if (
    !Array.isArray(
      aportacionesRecibidas,
    )
  ) {
    throw new AportacionAdminError(
      'El servidor no devolvió una lista válida de aportaciones.',
    )
  }

  if (
    !Array.isArray(
      estudiantesRecibidos,
    )
  ) {
    throw new AportacionAdminError(
      'El servidor no devolvió una lista válida de estudiantes.',
    )
  }

  const aportaciones =
    aportacionesRecibidas.map(
      normalizarAportacion,
    )

  const estudiantes =
    estudiantesRecibidos
      .map(
        normalizarIdentidadEstudiante,
      )
      .filter(Boolean)

  return ordenarAportaciones(
    relacionarAportacionesConEstudiantes(
      aportaciones,
      estudiantes,
    ),
  )
}

/*
 * Obtiene las aportaciones del único
 * usuario mock habilitado actualmente.
 */
function listarAportacionesMock() {
  const identidadEstudiante =
    normalizarIdentidadEstudiante(
      usuarioMock,
    )

  const estudiantes =
    identidadEstudiante
      ? [identidadEstudiante]
      : []

  const aportaciones =
    leerAportacionesSimuladas()

  return ordenarAportaciones(
    relacionarAportacionesConEstudiantes(
      aportaciones,
      estudiantes,
    ),
  )
}

// Funciones públicas del servicio.
//Devuelve todas las aportaciones disponibles.
export async function listarAportaciones() {
  const registros =
    usarDatosAdminSimulados
      ? listarAportacionesMock()
      : await listarAportacionesBackend()

  return clonarDatos(registros)
}

// Devuelve unicamente las aportaciones pertenecientes al estudiante identificado por su numero de cuenta.
export async function listarAportacionesPorEstudiante(
  numeroCuenta,
) {
  const cuenta = prepararTexto(numeroCuenta)

  if (!/^\d{11}$/.test(cuenta)) {
    throw new AportacionAdminError(
      'El número de cuenta del estudiante no es válido.',
    )
  }

  const registros = await listarAportaciones()

  return registros.filter(
    (registro) =>
      registro.aportacion.num_cuenta === cuenta,
  )
}

/*
 * Busca una aportación por su identificador.
 *
 * El backend no ofrece todavía una ruta GET individual,
 * por lo que se utiliza el listado administrativo.
 */
export async function obtenerAportacion(
  identificador,
) {
  const aportacionId =
    prepararIdentificador(
      identificador,
    )

  const registros =
    await listarAportaciones()

  const registro =
    registros.find(
      (registroActual) =>
        registroActual.aportacion.id ===
        aportacionId,
    )

  return registro
    ? clonarDatos(registro)
    : null
}

/*
 * Aprueba o rechaza una aportación.
 *
 * Antes de enviar la operación se comprueba que
 * la aportación continúe pendiente.
 */
export async function revisarAportacion(
  identificador,
  revisionRecibida,
) {
  const aportacionId =
    prepararIdentificador(
      identificador,
    )

  const revision =
    normalizarRevision(
      revisionRecibida,
    )

  const registroActual =
    await obtenerAportacion(
      aportacionId,
    )

  if (!registroActual) {
    throw new AportacionAdminError(
      'La aportación que deseas revisar no existe.',
    )
  }

  // La interfaz considera las decisiones finales.
  if (
    registroActual.aportacion.estado !==
    ESTADOS_APORTACION.PENDIENTE
  ) {
    throw new AportacionAdminError(
      'Esta aportación ya fue revisada y no puede modificarse nuevamente.',
    )
  }

  if (usarDatosAdminSimulados) {
    revisarAportacionSimulada(
      aportacionId,
      revision,
    )

    return {
      id: aportacionId,
      estado: revision.estado,

      meses_aprobados:
        revision.meses_aprobados,

      mensaje:
        revision.estado ===
        ESTADOS_APORTACION.APROBADO
          ? 'La aportación fue aprobada correctamente.'
          : 'La aportación fue rechazada correctamente.',
    }
  }

  const respuesta =
    await peticionApi(
      `/aportaciones/${encodeURIComponent(
        aportacionId,
      )}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          estado: revision.estado,

          meses_aprobados:
            revision.meses_aprobados,
        }),
      },
    )

  return {
    id: aportacionId,
    estado: revision.estado,

    meses_aprobados:
      revision.meses_aprobados,

    mensaje:
      prepararTexto(
        respuesta?.mensaje,
      ) ||
      (
        revision.estado ===
        ESTADOS_APORTACION.APROBADO
          ? 'La aportación fue aprobada correctamente.'
          : 'La aportación fue rechazada correctamente.'
      ),
  }
}

/*
 * Restaura las aportaciones originales
 * del usuario mock.
 */
export async function restablecerAportacionesSimuladas() {
  if (!usarDatosAdminSimulados) {
    throw new AportacionAdminError(
      'El restablecimiento solo está disponible en modo simulado.',
    )
  }

  const aportacionesIniciales =
    obtenerAportacionesIniciales()

  guardarAportacionesSimuladas(
    aportacionesIniciales,
  )

  return listarAportaciones()
}