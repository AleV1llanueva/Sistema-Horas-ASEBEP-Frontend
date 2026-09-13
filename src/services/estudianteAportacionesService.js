/*
 * Servicio de aportaciones del portal estudiantil.
 * Este archivo permite trabajar de dos maneras:
 *
 * true  -> usuario mock y localStorage compartido.
 * false -> consumo real del backend.
 */
import {
  ApiError,
  apiFetch,
} from './api.js'

import {
  ESTADOS_APORTACION_BACKEND,
  usuarioMock,
} from '../mocks/usuarioMock.js'

import {
  obtenerNumeroCuentaSesion,
} from './sesionService.js'

const CLAVE_APORTACIONES_SIMULADAS =
  'asebep_aportaciones_simuladas_v1'

/*
 * Se utiliza el mismo interruptor del módulo administrativo.
 *
 * true  -> localStorage.
 * false -> backend.
 */
const usarDatosSimulados =
  import.meta.env
    .VITE_USAR_DATOS_ADMIN_SIMULADOS ===
  'true'

/*
 * El backend únicamente acepta comprobantes PDF.
 */
export const FORMATOS_COMPROBANTE_ACEPTADOS =
  '.pdf,application/pdf'

const TIPO_MIME_PDF =
  'application/pdf'

/*
 * Cuota utilizada solamente para presentar el resumen
 * monetario del estudiante.
 *
 * El monto no forma parte del formulario de aportaciones.
 */
export const CUOTA_MENSUAL_APORTACION =
  20

// Estados exactos definidos actualmente por el backend.
export const ESTADOS_APORTACION =
  Object.freeze({
    PENDIENTE:
      ESTADOS_APORTACION_BACKEND
        .PENDIENTE,

    APROBADO:
      ESTADOS_APORTACION_BACKEND
        .APROBADO,

    RECHAZADO:
      ESTADOS_APORTACION_BACKEND
        .RECHAZADO,

    PENDIENTE_APROBACION:
      ESTADOS_APORTACION_BACKEND
        .PENDIENTE,

    APROBADA:
      ESTADOS_APORTACION_BACKEND
        .APROBADO,

    REQUIERE_CORRECCION:
      ESTADOS_APORTACION_BACKEND
        .RECHAZADO,
  })


export const TIPOS_APORTACION =
  Object.freeze({
    UN_MES: 'un_mes',
    VARIOS_MESES: 'varios_meses',
  })

/* ERROR PROPIO DEL SERVICIO */

export class EstudianteAportacionesError
  extends Error {
  constructor(
    mensaje,
    codigo = 'ERROR_APORTACIONES',
    estadoHttp = null,
    detalles = null,
  ) {
    super(mensaje)

    this.name =
      'EstudianteAportacionesError'

    this.codigo = codigo
    this.estadoHttp = estadoHttp
    this.detalles = detalles
  }
}

/* FUNCIONES GENERALES */
function esObjeto(valor) {
  return (
    valor !== null &&
    typeof valor === 'object' &&
    !Array.isArray(valor)
  )
}

/*
 * Convierte un valor en texto y elimina espacios
 * innecesarios al inicio y al final.
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

// Convierte un valor en un número entero.
function prepararEntero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return null
  }

  const numero = Number(valor)

  return Number.isInteger(numero)
    ? numero
    : null
}

/*
 * Crea una copia independiente para evitar que los
 * componentes modifiquen directamente localStorage.
 */
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Obtiene la cuenta exclusivamente desde la sesión.
 *
 * El número de cuenta nunca se recibe desde el formulario
 * ni se agrega al FormData enviado al backend.
 */
function obtenerNumeroCuentaActual() {
  const numeroCuenta =
    prepararTexto(
      obtenerNumeroCuentaSesion(),
    )

  if (!numeroCuenta) {
    throw new EstudianteAportacionesError(
      'No existe una sesión válida para consultar las aportaciones.',
      'SESION_NO_DISPONIBLE',
    )
  }

  if (usarDatosSimulados) {
    const numeroCuentaMock =
      prepararTexto(
        usuarioMock
          ?.datosPersonales
          ?.numeroCuenta,
      )

    if (
      !numeroCuentaMock ||
      numeroCuenta !== numeroCuentaMock
    ) {
      throw new EstudianteAportacionesError(
        'La cuenta actual no corresponde al estudiante de prueba.',
        'CUENTA_SIMULADA_NO_DISPONIBLE',
      )
    }
  }

  return numeroCuenta
}

// Obtiene localStorage de forma segura.
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
 * Ordena las aportaciones desde la más reciente
 * hasta la más antigua.
 */
function ordenarAportaciones(
  aportaciones,
) {
  return [...aportaciones].sort(
    (
      primeraAportacion,
      segundaAportacion,
    ) =>
      new Date(
        segundaAportacion
          .fecha_subida,
      ).getTime() -
      new Date(
        primeraAportacion
          .fecha_subida,
      ).getTime(),
  )
}

/* VALIDACIÓN DEL CONTRATO */
function validarIdentificador(valor) {
  const identificador =
    prepararEntero(valor)

  if (
    identificador === null ||
    identificador <= 0
  ) {
    throw new EstudianteAportacionesError(
      'La aportación contiene un identificador inválido.',
      'IDENTIFICADOR_INVALIDO',
    )
  }

  return identificador
}

/*
 * Convierte posibles variantes visuales al estado
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
    throw new EstudianteAportacionesError(
      `El estado "${prepararTexto(valor)}" no pertenece al contrato de aportaciones.`,
      'ESTADO_INVALIDO',
    )
  }

  return estadoNormalizado
}

/*
 * Comprueba que meses_aprobados sea un entero
 * mayor o igual que cero.
 */
function normalizarMesesAprobados(
  valor,
) {
  const meses =
    prepararEntero(valor ?? 0)

  if (
    meses === null ||
    meses < 0
  ) {
    throw new EstudianteAportacionesError(
      'La cantidad de meses aprobados no es válida.',
      'MESES_APROBADOS_INVALIDOS',
    )
  }

  return meses
}

/*
 * Comprueba que fecha_subida pueda interpretarse
 * correctamente como una fecha.
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
    throw new EstudianteAportacionesError(
      'La aportación contiene una fecha de subida inválida.',
      'FECHA_SUBIDA_INVALIDA',
    )
  }

  return fechaSubida
}

/*
 * Obtiene el nombre final del PDF desde una ruta.
 *
 * Funciona tanto con separadores de Linux como de Windows.
 */
function obtenerNombreArchivo(
  rutaArchivo,
) {
  const ruta =
    prepararTexto(rutaArchivo)

  if (!ruta) {
    return 'comprobante.pdf'
  }

  const partes =
    ruta.split(/[\\/]/)

  return (
    prepararTexto(partes.at(-1)) ||
    'comprobante.pdf'
  )
}


function obtenerMensajeEstado(
  estado,
  mesesAprobados,
) {
  if (
    estado ===
    ESTADOS_APORTACION.APROBADO
  ) {
    return (
      mesesAprobados === 1
        ? 'ASEBEP aprobó un mes correspondiente a esta aportación.'
        : `ASEBEP aprobó ${mesesAprobados} meses correspondientes a esta aportación.`
    )
  }

  if (
    estado ===
    ESTADOS_APORTACION.RECHAZADO
  ) {
    return (
      'La aportación fue rechazada. Para realizar otro envío debes registrar una nueva aportación.'
    )
  }

  return (
    'Tu aportación fue recibida correctamente y se encuentra pendiente de revisión.'
  )
}

// Normaliza AportacionResponse.
function normalizarAportacion(
  aportacion,
) {
  if (!esObjeto(aportacion)) {
    throw new EstudianteAportacionesError(
      'Una aportación tiene un formato inválido.',
      'APORTACION_INVALIDA',
    )
  }

  const numeroCuenta =
    prepararTexto(
      aportacion.num_cuenta ??
      aportacion.numeroCuenta,
    )

  const numeroReferencia =
    prepararTexto(
      aportacion.num_referencia ??
      aportacion.numeroReferencia,
    )

  const descripcionPreparada =
    prepararTexto(
      aportacion.descripcion,
    )

  const rutaPdf =
    prepararTexto(
      aportacion.ruta_pdf ??
      aportacion.rutaPdf,
    )

  const fechaSubida =
    normalizarFechaSubida(
      aportacion.fecha_subida ??
      aportacion.fechaEnvio,
    )

  const estado =
    normalizarEstado(
      aportacion.estado,
    )

  const mesesAprobados =
    normalizarMesesAprobados(
      aportacion.meses_aprobados ??
      aportacion.mesesAprobados ??
      0,
    )

  if (!numeroCuenta) {
    throw new EstudianteAportacionesError(
      'La aportación no contiene número de cuenta.',
      'NUMERO_CUENTA_INVALIDO',
    )
  }

  if (!numeroReferencia) {
    throw new EstudianteAportacionesError(
      'La aportación no contiene número de referencia.',
      'REFERENCIA_INVALIDA',
    )
  }

  if (!rutaPdf) {
    throw new EstudianteAportacionesError(
      'La aportación no contiene la ruta del comprobante PDF.',
      'RUTA_PDF_INVALIDA',
    )
  }

  const descripcion =
    descripcionPreparada || null

  /*
   * El contrato no permite conocer anticipadamente
   * cuántos meses representa una aportación pendiente.
   *
   * Estos valores existen únicamente para que las vistas
   * anteriores no produzcan errores mientras se reemplazan.
   */
  const tipoTemporal =
    mesesAprobados > 1
      ? TIPOS_APORTACION
          .VARIOS_MESES
      : TIPOS_APORTACION.UN_MES

  return {
    /* Campos exactos de AportacionResponse. */
    id:
      validarIdentificador(
        aportacion.id,
      ),

    num_cuenta: numeroCuenta,

    num_referencia:
      numeroReferencia,

    descripcion,

    ruta_pdf: rutaPdf,

    estado,

    meses_aprobados:
      mesesAprobados,

    fecha_subida:
      fechaSubida,

    /*
     * Alias temporales para Contributions.jsx
     * y ContributionDetail.jsx.
     */
    numeroCuenta,

    numeroReferencia,

    fechaEnvio: fechaSubida,

    tipo: tipoTemporal,

    mesAportacion: null,

    anioAportacion: null,

    fechaPago: null,

    cantidadMeses:
      mesesAprobados,

    monto:
      mesesAprobados *
      CUOTA_MENSUAL_APORTACION,

    observacionAsebep:
      obtenerMensajeEstado(
        estado,
        mesesAprobados,
      ),

    comprobante: {
      nombreOriginal:
        obtenerNombreArchivo(
          rutaPdf,
        ),

      tipoMime:
        TIPO_MIME_PDF,

      tamanioBytes: null,
    },
  }
}

/*
 * Extrae únicamente los campos del contrato antes
 * de guardar una aportación en localStorage.
 *
 * De esta manera el administrador siempre recibirá
 * exactamente el mismo formato que entregaría el backend.
 */
function convertirAContrato(
  aportacion,
) {
  const aportacionNormalizada =
    normalizarAportacion(
      aportacion,
    )

  return {
    id:
      aportacionNormalizada.id,

    num_cuenta:
      aportacionNormalizada
        .num_cuenta,

    num_referencia:
      aportacionNormalizada
        .num_referencia,

    descripcion:
      aportacionNormalizada
        .descripcion,

    ruta_pdf:
      aportacionNormalizada
        .ruta_pdf,

    estado:
      aportacionNormalizada.estado,

    meses_aprobados:
      aportacionNormalizada
        .meses_aprobados,

    fecha_subida:
      aportacionNormalizada
        .fecha_subida,
  }
}

/* =========================================================
 * VALIDACIÓN DEL FORMULARIO
 * ======================================================= */

function validarNumeroReferencia(valor) {
  const numeroReferencia =
    prepararTexto(valor)

  if (!numeroReferencia) {
    throw new EstudianteAportacionesError(
      'Ingresa el número de referencia del comprobante.',
      'REFERENCIA_OBLIGATORIA',
    )
  }

  return numeroReferencia
}

function validarDescripcion(valor) {
  const descripcion =
    prepararTexto(valor)

  if (!descripcion) {
    throw new EstudianteAportacionesError(
      'Escribe una descripción para la aportación.',
      'DESCRIPCION_OBLIGATORIA',
    )
  }

  return descripcion
}

/*
 * Valida el comprobante PDF.
 *
 * El backend valida principalmente la extensión .pdf.
 * No se agrega un límite de tamaño inventado porque el
 * contrato actual no establece uno.
 */
export function validarComprobantePdf(
  archivo,
) {
  if (
    !archivo ||
    typeof archivo !== 'object'
  ) {
    throw new EstudianteAportacionesError(
      'Selecciona el comprobante en formato PDF.',
      'COMPROBANTE_OBLIGATORIO',
    )
  }

  const nombreOriginal =
    prepararTexto(archivo.name)

  const tipoMime =
    prepararTexto(archivo.type)
      .toLocaleLowerCase('es')

  const tamanioBytes =
    Number(archivo.size)

  if (!nombreOriginal) {
    throw new EstudianteAportacionesError(
      'El archivo seleccionado no tiene un nombre válido.',
      'NOMBRE_ARCHIVO_INVALIDO',
    )
  }

  if (
    !nombreOriginal
      .toLocaleLowerCase('es')
      .endsWith('.pdf')
  ) {
    throw new EstudianteAportacionesError(
      'El comprobante debe ser un archivo PDF.',
      'FORMATO_ARCHIVO_INVALIDO',
    )
  }

  /*
   * Algunos navegadores pueden entregar el tipo MIME vacío.
   * En ese caso se conserva la validación por extensión.
   */
  if (
    tipoMime &&
    tipoMime !== TIPO_MIME_PDF
  ) {
    throw new EstudianteAportacionesError(
      'El tipo del archivo seleccionado no corresponde a un PDF.',
      'TIPO_ARCHIVO_INVALIDO',
    )
  }

  if (
    !Number.isFinite(tamanioBytes) ||
    tamanioBytes <= 0
  ) {
    throw new EstudianteAportacionesError(
      'El archivo PDF está vacío o no puede leerse.',
      'ARCHIVO_VACIO',
    )
  }

  return {
    archivo,
    nombreOriginal,
    tipoMime:
      tipoMime ||
      TIPO_MIME_PDF,

    tamanioBytes,
  }
}

/*
 * Alias temporal para que Contributions.jsx siga compilando.
 *
 * Aunque conserva el nombre antiguo, ahora valida PDF.
 * Se eliminará cuando actualicemos esa página.
 */
export function validarComprobanteImagen(
  archivo,
) {
  return validarComprobantePdf(
    archivo,
  )
}

/*
 * Prepara solamente los tres campos permitidos
 * por POST /aportaciones.
 */
function normalizarDatosRegistro(
  datosFormulario,
) {
  if (!esObjeto(datosFormulario)) {
    throw new EstudianteAportacionesError(
      'Los datos de la aportación no son válidos.',
      'FORMULARIO_INVALIDO',
    )
  }

  const numeroReferencia =
    validarNumeroReferencia(
      datosFormulario
        .numeroReferencia ??
      datosFormulario
        .num_referencia,
    )

  const descripcion =
    validarDescripcion(
      datosFormulario.descripcion,
    )

  const comprobante =
    validarComprobantePdf(
      datosFormulario.archivoPdf ??
      datosFormulario.archivo_pdf ??
      datosFormulario.archivo,
    )

  return {
    numeroReferencia,
    descripcion,
    archivo:
      comprobante.archivo,

    nombreArchivo:
      comprobante.nombreOriginal,
  }
}

/* =========================================================
 * FUNCIONES MONETARIAS DE PRESENTACIÓN
 * ======================================================= */

/*
 * Esta función se conserva para mostrar resúmenes.
 *
 * El resultado nunca se envía en el formulario
 * ni forma parte de POST /aportaciones.
 */
export function calcularMontoAportacion(
  cantidadMeses,
) {
  const cantidad =
    prepararEntero(cantidadMeses)

  if (
    cantidad === null ||
    cantidad < 0
  ) {
    throw new EstudianteAportacionesError(
      'La cantidad de meses no es válida.',
      'CANTIDAD_MESES_INVALIDA',
    )
  }

  return (
    cantidad *
    CUOTA_MENSUAL_APORTACION
  )
}

/*
 * Calcula el saldo visual desde meses_sin_pagar.
 *
 * El backend devuelve la cantidad de meses y el frontend
 * la presenta usando la cuota actual de L 20.
 */
export function calcularResumenDeuda(
  mesesSinPagar,
) {
  const cantidad =
    prepararEntero(
      mesesSinPagar ?? 0,
    )

  if (
    cantidad === null ||
    cantidad < 0
  ) {
    throw new EstudianteAportacionesError(
      'La cantidad de meses pendientes no es válida.',
      'DEUDA_INVALIDA',
    )
  }

  return {
    mesesPendientes: cantidad,

    montoPendiente:
      cantidad *
      CUOTA_MENSUAL_APORTACION,
  }
}

/* =========================================================
 * ALMACENAMIENTO SIMULADO COMPARTIDO
 * ======================================================= */

/*
 * Obtiene las aportaciones iniciales declaradas
 * dentro del usuario mock 20249999999.
 */
function obtenerAportacionesIniciales() {
  if (
    !Array.isArray(
      usuarioMock.aportaciones,
    )
  ) {
    throw new EstudianteAportacionesError(
      'El usuario mock no contiene una lista válida de aportaciones.',
      'APORTACIONES_MOCK_INVALIDAS',
    )
  }

  return usuarioMock.aportaciones.map(
    convertirAContrato,
  )
}

/*
 * Guarda exclusivamente la estructura del backend.
 */
function guardarAportacionesSimuladas(
  aportaciones,
) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteAportacionesError(
      'El almacenamiento local no está disponible.',
      'ALMACENAMIENTO_NO_DISPONIBLE',
    )
  }

  const registros =
    aportaciones.map(
      convertirAContrato,
    )

  try {
    almacenamiento.setItem(
      CLAVE_APORTACIONES_SIMULADAS,
      JSON.stringify(registros),
    )
  } catch {
    throw new EstudianteAportacionesError(
      'No fue posible guardar las aportaciones simuladas.',
      'ERROR_GUARDANDO_APORTACIONES',
    )
  }
}

/*
 * Lee la colección compartida.
 *
 * Cuando todavía no existe localStorage, inicializa los
 * registros a partir de usuarioMock.
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
    throw new EstudianteAportacionesError(
      'No fue posible consultar las aportaciones simuladas.',
      'ERROR_LEYENDO_APORTACIONES',
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
    throw new EstudianteAportacionesError(
      'Las aportaciones guardadas contienen un JSON inválido.',
      'JSON_APORTACIONES_INVALIDO',
    )
  }

  if (
    !Array.isArray(
      aportacionesGuardadas,
    )
  ) {
    throw new EstudianteAportacionesError(
      'Las aportaciones guardadas no contienen una lista válida.',
      'COLECCION_APORTACIONES_INVALIDA',
    )
  }

  return aportacionesGuardadas.map(
    convertirAContrato,
  )
}

/*
 * Genera el siguiente identificador numérico.
 *
 * Se imita el identificador entero utilizado
 * por la base de datos del backend.
 */
function obtenerSiguienteIdentificador(
  aportaciones,
) {
  const identificadorMayor =
    aportaciones.reduce(
      (
        mayorActual,
        aportacion,
      ) =>
        Math.max(
          mayorActual,
          validarIdentificador(
            aportacion.id,
          ),
        ),
      0,
    )

  return identificadorMayor + 1
}

/*
 * Limpia únicamente los caracteres que podrían alterar
 * la ruta simulada del archivo.
 *
 * El número de referencia original se conserva sin cambios.
 */
function prepararSegmentoRuta(valor) {
  return (
    prepararTexto(valor)
      .replace(
        /[\\/:*?"<>|]/g,
        '-',
      )
      .replace(/\s+/g, '-')
  )
}

/*
 * Registra una nueva aportación simulada utilizando
 * exactamente la estructura de AportacionResponse.
 */
function registrarAportacionSimulada({
  numeroCuenta,
  numeroReferencia,
  descripcion,
  nombreArchivo,
}) {
  const aportaciones =
    leerAportacionesSimuladas()

  const referenciaUtilizada =
    aportaciones.some(
      (aportacion) =>
        aportacion.num_referencia ===
        numeroReferencia,
    )

  if (referenciaUtilizada) {
    throw new EstudianteAportacionesError(
      'El número de referencia ya fue utilizado.',
      'REFERENCIA_DUPLICADA',
    )
  }

  const nombreRuta =
    prepararSegmentoRuta(
      nombreArchivo,
    ) || 'comprobante.pdf'

  const referenciaRuta =
    prepararSegmentoRuta(
      numeroReferencia,
    ) || 'sin-referencia'

  const nuevaAportacion = {
    id:
      obtenerSiguienteIdentificador(
        aportaciones,
      ),

    num_cuenta:
      numeroCuenta,

    num_referencia:
      numeroReferencia,

    descripcion,

    ruta_pdf:
      `uploads/aportaciones/${numeroCuenta}_${referenciaRuta}_${nombreRuta}`,

    estado:
      ESTADOS_APORTACION.PENDIENTE,

    /*
     * Los meses se mantienen en cero hasta que
     * el administrador apruebe el comprobante.
     */
    meses_aprobados: 0,

    fecha_subida:
      new Date().toISOString(),
  }

  guardarAportacionesSimuladas([
    nuevaAportacion,
    ...aportaciones,
  ])

  return normalizarAportacion(
    nuevaAportacion,
  )
}

/* =========================================================
 * CONSUMO DE LA API
 * ======================================================= */

/*
 * Centraliza los errores producidos por apiFetch.
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
      throw new EstudianteAportacionesError(
        error.message,
        'ERROR_API_APORTACIONES',
        error.status,
        error.details,
      )
    }

    if (
      error instanceof
      EstudianteAportacionesError
    ) {
      throw error
    }

    throw new EstudianteAportacionesError(
      'No fue posible conectar con el servidor de aportaciones.',
      'ERROR_CONEXION_APORTACIONES',
    )
  }
}

/*
 * Consume GET /becario/aportaciones.
 */
async function listarAportacionesBackend(
  numeroCuenta,
) {
  const respuesta =
    await peticionApi(
      '/becario/aportaciones',
    )

  if (!Array.isArray(respuesta)) {
    throw new EstudianteAportacionesError(
      'El servidor no devolvió una lista válida de aportaciones.',
      'RESPUESTA_API_INVALIDA',
    )
  }

  const aportaciones =
    respuesta.map(
      normalizarAportacion,
    )

  /*
   * Esta ruta debe devolver exclusivamente las
   * aportaciones del becario autenticado.
   */
  const contieneCuentaAjena =
    aportaciones.some(
      (aportacion) =>
        aportacion.num_cuenta !==
        numeroCuenta,
    )

  if (contieneCuentaAjena) {
    throw new EstudianteAportacionesError(
      'El servidor devolvió una aportación perteneciente a otra cuenta.',
      'RESPUESTA_CUENTA_INVALIDA',
    )
  }

  return aportaciones
}

/*
 * Consume POST /aportaciones.
 *
 * No debe establecerse Content-Type manualmente.
 * El navegador agrega automáticamente el boundary
 * necesario para multipart/form-data.
 */
async function registrarAportacionBackend({
  numeroCuenta,
  numeroReferencia,
  descripcion,
  archivo,
}) {
  if (
    typeof FormData === 'undefined'
  ) {
    throw new EstudianteAportacionesError(
      'El navegador no permite preparar el envío del comprobante.',
      'FORM_DATA_NO_DISPONIBLE',
    )
  }

  /*
   * En modo API se requiere un archivo real para que
   * FormData pueda enviarlo como UploadFile.
   */
  if (
    typeof Blob !== 'undefined' &&
    !(archivo instanceof Blob)
  ) {
    throw new EstudianteAportacionesError(
      'El comprobante seleccionado no es un archivo válido.',
      'ARCHIVO_REAL_REQUERIDO',
    )
  }

  const formulario =
    new FormData()

  /*
   * Estos son los únicos tres campos aceptados
   * actualmente por el backend.
   */
  formulario.append(
    'num_referencia',
    numeroReferencia,
  )

  formulario.append(
    'descripcion',
    descripcion,
  )

  formulario.append(
    'archivo_pdf',
    archivo,
    archivo.name,
  )

  const respuesta =
    await peticionApi(
      '/aportaciones',
      {
        method: 'POST',
        body: formulario,
      },
    )

  const aportacion =
    normalizarAportacion(
      respuesta,
    )

  /*
   * Aunque la cuenta no se envía en el formulario,
   * la respuesta debe corresponder a la sesión actual.
   */
  if (
    aportacion.num_cuenta !==
    numeroCuenta
  ) {
    throw new EstudianteAportacionesError(
      'El servidor registró la aportación para una cuenta diferente.',
      'RESPUESTA_CUENTA_INVALIDA',
    )
  }

  return aportacion
}

/* =========================================================
 * FUNCIONES PÚBLICAS
 * ======================================================= */

/*
 * Devuelve el historial del estudiante autenticado.
 */
export async function listarAportacionesEstudiante() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  const aportaciones =
    usarDatosSimulados
      ? leerAportacionesSimuladas()
          .map(
            normalizarAportacion,
          )
      : await listarAportacionesBackend(
          numeroCuenta,
        )

  const historialPropio =
    aportaciones.filter(
      (aportacion) =>
        aportacion.num_cuenta ===
        numeroCuenta,
    )

  return clonarDatos(
    ordenarAportaciones(
      historialPropio,
    ),
  )
}

/*
 * Busca una aportación perteneciente al
 * estudiante autenticado.
 *
 * El backend no dispone de una ruta GET individual,
 * por lo que se busca dentro del historial.
 */
export async function obtenerAportacionEstudiante(
  identificador,
) {
  const id =
    validarIdentificador(
      identificador,
    )

  const aportaciones =
    await listarAportacionesEstudiante()

  const aportacion =
    aportaciones.find(
      (registro) =>
        registro.id === id,
    )

  return aportacion
    ? clonarDatos(aportacion)
    : null
}

/*
 * Registra una aportación utilizando el contrato actual.
 *
 * Este será el método utilizado por la nueva versión
 * de Contributions.jsx.
 */
export async function registrarAportacionEstudiante(
  datosFormulario,
) {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  const datos =
    normalizarDatosRegistro(
      datosFormulario,
    )

  const aportacion =
    usarDatosSimulados
      ? registrarAportacionSimulada({
          numeroCuenta,

          numeroReferencia:
            datos.numeroReferencia,

          descripcion:
            datos.descripcion,

          nombreArchivo:
            datos.nombreArchivo,
        })
      : await registrarAportacionBackend({
          numeroCuenta,

          numeroReferencia:
            datos.numeroReferencia,

          descripcion:
            datos.descripcion,

          archivo:
            datos.archivo,
        })

  return clonarDatos(
    aportacion,
  )
}

/*
 * Compatibilidad temporal con el formulario antiguo
 * de una sola aportación.
 *
 * Los campos de mes, año, fecha y monto se ignoran.
 * Nunca se agregan al FormData ni a localStorage.
 */
export async function registrarAportacionUnMes(
  datosFormulario,
) {
  return registrarAportacionEstudiante({
    numeroReferencia:
      datosFormulario
        ?.numeroReferencia,

    descripcion:
      prepararTexto(
        datosFormulario
          ?.descripcion,
      ) ||
      'Comprobante de aportación enviado por el estudiante.',

    archivo:
      datosFormulario?.archivo,
  })
}

/*
 * Compatibilidad temporal con el formulario antiguo
 * de varios meses.
 *
 * La cantidad de meses recibida se ignora completamente.
 * El administrador será quien determine los meses aprobados.
 */
export async function registrarAportacionVariosMeses(
  datosFormulario,
) {
  return registrarAportacionEstudiante({
    numeroReferencia:
      datosFormulario
        ?.numeroReferencia,

    descripcion:
      prepararTexto(
        datosFormulario
          ?.descripcion,
      ) ||
      'Comprobante de aportación enviado por el estudiante.',

    archivo:
      datosFormulario?.archivo,
  })
}

/*
 * Restaura las aportaciones originales del usuario mock.
 *
 * Esta acción está disponible exclusivamente
 * cuando la simulación se encuentra habilitada.
 */
export async function restablecerAportacionesEstudiante() {
  if (!usarDatosSimulados) {
    throw new EstudianteAportacionesError(
      'El restablecimiento solo está disponible en modo simulado.',
      'RESTABLECIMIENTO_NO_DISPONIBLE',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  const numeroCuentaMock =
    prepararTexto(
      usuarioMock
        ?.datosPersonales
        ?.numeroCuenta,
    )

  if (
    numeroCuenta !==
    numeroCuentaMock
  ) {
    throw new EstudianteAportacionesError(
      'La cuenta actual no corresponde al estudiante de prueba.',
      'CUENTA_SIMULADA_NO_DISPONIBLE',
    )
  }

  const aportacionesIniciales =
    obtenerAportacionesIniciales()

  guardarAportacionesSimuladas(
    aportacionesIniciales,
  )

  return listarAportacionesEstudiante()
}