/*
 * Servicio de aportaciones del portal del estudiante.
 *
 * Durante el desarrollo utiliza los datos simulados y localStorage.
 * Todas las funciones públicas son asincrónicas para conservar
 * la misma forma de consumo cuando el backend publique su contrato.
 */

import {
  aportacionesEstudianteMock,
  CUOTA_MENSUAL_APORTACION,
  ESTADOS_APORTACION,
  NUMERO_CUENTA_APORTACIONES_PRUEBA,
  TIPOS_APORTACION,
} from '../mocks/estudianteAportacionesMock.js'
import {
  obtenerNumeroCuentaSesion,
} from './sesionService.js'

/*
 * Reexportamos la configuración que necesitarán las páginas.
 *
 * De esta manera, los componentes consumirán siempre el servicio
 * y no dependerán directamente del archivo de datos simulados.
 */
export {
  CUOTA_MENSUAL_APORTACION,
  ESTADOS_APORTACION,
  TIPOS_APORTACION,
}

/*
 * Configuración de los comprobantes permitidos.
 */
export const MAXIMO_COMPROBANTE_BYTES =
  3 * 1024 * 1024

export const FORMATOS_COMPROBANTE_ACEPTADOS =
  '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

const TIPOS_MIME_PERMITIDOS =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ])

const EXTENSIONES_PERMITIDAS =
  new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',
  ])

// Clave independiente para guardar solamente los registros simulados del módulo de aportaciones.
const CLAVE_APORTACIONES_ESTUDIANTE =
  'asebep_estudiante_aportaciones_simuladas'

/*
 * Los datos simulados únicamente se habilitan durante desarrollo.
 * En producción siempre deberá utilizarse el backend.
 */
const usarDatosSimulados =
  import.meta.env.DEV &&
  import.meta.env
    .VITE_USAR_DATOS_SIMULADOS === 'true'

/*
 * Error propio del módulo.
 *
 * El código permite que las páginas distingan el tipo de problema
 * sin depender exclusivamente del mensaje mostrado al usuario.
 */
export class EstudianteAportacionesError
  extends Error {
  constructor(
    mensaje,
    codigo = 'ERROR_APORTACIONES',
  ) {
    super(mensaje)

    this.name =
      'EstudianteAportacionesError'
    this.codigo = codigo
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
 * Convierte un valor en número entero.
 *
 * Cuando no puede convertirlo, devuelve el valor
 * predeterminado recibido.
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

/*
 * Crea copias independientes para impedir que los componentes
 * modifiquen accidentalmente los datos almacenados.
 */
function clonarDatos(datos) {
  return JSON.parse(
    JSON.stringify(datos),
  )
}

/*
 * Genera un identificador provisional para cada comprobante.
 */
function crearIdentificadorAportacion() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return (
      `aportacion-` +
      `${crypto.randomUUID()}`
    )
  }

  return (
    `aportacion-${Date.now()}-` +
    Math.random().toString(16).slice(2)
  )
}

/*
 * Obtiene localStorage de forma segura.
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
 * Normaliza textos utilizados como identificadores internos.
 *
 * También elimina tildes para aceptar temporalmente variantes
 * como "corrección" y "correccion".
 */
function normalizarClave(valor) {
  return prepararTexto(valor)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(/[\s-]+/g, '_')
}

/*
 * Adapta posibles nombres de estado utilizados por el backend
 * o por el módulo administrativo.
 */
function normalizarEstadoAportacion(
  valor,
) {
  const estado =
    normalizarClave(valor)

  if (
    estado === 'pendiente' ||
    estado ===
      'pendiente_aprobacion' ||
    estado ===
      'pendiente_de_aprobacion'
  ) {
    return (
      ESTADOS_APORTACION
        .PENDIENTE_APROBACION
    )
  }

  if (
    estado === 'aprobada' ||
    estado === 'aprobado' ||
    estado === 'confirmada' ||
    estado === 'confirmado'
  ) {
    return ESTADOS_APORTACION.APROBADA
  }

  if (
    estado ===
      'requiere_correccion' ||
    estado ===
      'correccion_requerida'
  ) {
    return (
      ESTADOS_APORTACION
        .REQUIERE_CORRECCION
    )
  }

  return null
}

/*
 * Valida una fecha con formato YYYY-MM-DD.
 *
 * Además del patrón, comprueba que el día realmente exista.
 */
function esFechaValida(fecha) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      fecha,
    )
  ) {
    return false
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

  return (
    fechaLocal.getFullYear() === anio &&
    fechaLocal.getMonth() === mes - 1 &&
    fechaLocal.getDate() === dia
  )
}

/*
 * Valida la fecha de pago antes de construir
 * un nuevo registro.
 */
function validarFechaPago(valor) {
  const fecha =
    prepararTexto(valor)

  if (!esFechaValida(fecha)) {
    throw new EstudianteAportacionesError(
      'Selecciona una fecha de pago válida.',
      'FECHA_PAGO_INVALIDA',
    )
  }

  return fecha
}

/*
 * Valida el mes elegido en el formulario
 * de una sola aportación.
 */
function validarMesAportacion(valor) {
  const mes =
    prepararEntero(valor)

  if (
    mes === null ||
    mes < 1 ||
    mes > 12
  ) {
    throw new EstudianteAportacionesError(
      'Selecciona un mes de aportación válido.',
      'MES_APORTACION_INVALIDO',
    )
  }

  return mes
}

// Valida el año asociado con una aportación individual.
function validarAnioAportacion(valor) {
  const anio =
    prepararEntero(valor)

  if (
    anio === null ||
    anio < 1
  ) {
    throw new EstudianteAportacionesError(
      'Selecciona un año de aportación válido.',
      'ANIO_APORTACION_INVALIDO',
    )
  }

  return anio
}

/*
 * Valida la cantidad utilizada para calcular el monto.
 *
 * El mínimo cambia según el formulario:
 * - Pago individual: exactamente un mes.
 * - Pago múltiple: dos o más meses.
 */
function validarCantidadMeses(
  valor,
  minimo,
) {
  const cantidad =
    prepararEntero(valor)

  if (
    cantidad === null ||
    cantidad < minimo
  ) {
    const mensaje =
      minimo === 2
        ? 'La cantidad debe ser de dos meses o más.'
        : 'La cantidad de meses no es válida.'

    throw new EstudianteAportacionesError(
      mensaje,
      'CANTIDAD_MESES_INVALIDA',
    )
  }

  return cantidad
}

/*
 * El número de referencia se conserva como texto.
 *
 * Esto permite mantener posibles ceros iniciales
 * sin convertir el dato en una cantidad matemática.
 */
function validarNumeroReferencia(valor) {
  const numeroReferencia =
    prepararTexto(valor)

  if (!numeroReferencia) {
    throw new EstudianteAportacionesError(
      'Ingresa el número de referencia del comprobante.',
      'REFERENCIA_OBLIGATORIA',
    )
  }

  if (numeroReferencia.length > 80) {
    throw new EstudianteAportacionesError(
      'El número de referencia es demasiado largo.',
      'REFERENCIA_INVALIDA',
    )
  }

  return numeroReferencia
}

// Obtiene la extensión final del nombre del archivo.
function obtenerExtensionArchivo(nombre) {
  const partes =
    prepararTexto(nombre)
      .toLocaleLowerCase('es')
      .split('.')

  if (partes.length < 2) {
    return ''
  }

  return partes.at(-1)
}

/*
 * Valida el archivo antes de permitir su envío.
 *
 * La función acepta un File real del navegador o un objeto
 * equivalente para facilitar futuras pruebas.
 */
export function validarComprobanteImagen(
  archivo,
) {
  if (
    !archivo ||
    typeof archivo !== 'object'
  ) {
    throw new EstudianteAportacionesError(
      'Selecciona una imagen del comprobante.',
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

  const extension =
    obtenerExtensionArchivo(
      nombreOriginal,
    )

  if (
    !EXTENSIONES_PERMITIDAS.has(
      extension,
    )
  ) {
    throw new EstudianteAportacionesError(
      'El comprobante debe ser una imagen JPG, JPEG, PNG o WEBP.',
      'FORMATO_ARCHIVO_INVALIDO',
    )
  }

  /*
   * Algunos navegadores pueden entregar el tipo MIME vacío.
   * En ese caso se conserva la validación por extensión.
   */
  if (
    tipoMime &&
    !TIPOS_MIME_PERMITIDOS.has(
      tipoMime,
    )
  ) {
    throw new EstudianteAportacionesError(
      'El tipo del archivo seleccionado no está permitido.',
      'TIPO_ARCHIVO_INVALIDO',
    )
  }

  if (
    !Number.isFinite(tamanioBytes) ||
    tamanioBytes <= 0
  ) {
    throw new EstudianteAportacionesError(
      'La imagen seleccionada está vacía o no puede leerse.',
      'ARCHIVO_VACIO',
    )
  }

  if (
    tamanioBytes >
    MAXIMO_COMPROBANTE_BYTES
  ) {
    throw new EstudianteAportacionesError(
      'La imagen no debe superar los 3 MB.',
      'ARCHIVO_DEMASIADO_GRANDE',
    )
  }

  return {
    nombreOriginal,
    tipoMime:
      tipoMime ||
      `image/${
        extension === 'jpg'
          ? 'jpeg'
          : extension
      }`,
    tamanioBytes,
  }
}

/*
 * Normaliza los metadatos internos del archivo.
 *
 * Estos datos permiten simular el comprobante sin almacenar
 * el contenido binario de la imagen en localStorage.
 */
function normalizarComprobante(
  comprobante,
) {
  if (
    !comprobante ||
    typeof comprobante !== 'object' ||
    Array.isArray(comprobante)
  ) {
    return null
  }

  const nombreOriginal =
    prepararTexto(
      comprobante.nombreOriginal ??
      comprobante.nombre_original ??
      comprobante.nombre,
    )

  const tipoMime =
    prepararTexto(
      comprobante.tipoMime ??
      comprobante.tipo_mime,
    )

  const tamanioBytes =
    prepararEntero(
      comprobante.tamanioBytes ??
      comprobante.tamanio_bytes,
      null,
    )

  if (
    !nombreOriginal ||
    tamanioBytes === null ||
    tamanioBytes <= 0
  ) {
    return null
  }

  return {
    nombreOriginal,
    tipoMime,
    tamanioBytes,
  }
}

/*
 * Calcula el monto sin aceptar un valor escrito manualmente.
 *
 * Esta es la única función utilizada para establecer el monto
 * de los pagos individuales y múltiples.
 */
export function calcularMontoAportacion(
  cantidadMeses,
) {
  const cantidad =
    validarCantidadMeses(
      cantidadMeses,
      1,
    )

  return (
    cantidad *
    CUOTA_MENSUAL_APORTACION
  )
}

/*
 * Calcula el resumen de deuda recibido desde los datos del becario.
 *
 * Ejemplo:
 * cinco meses pendientes × L 20 = L 100.
 */
export function calcularResumenDeuda(
  mesesSinPagar,
) {
  const cantidad =
    prepararEntero(
      mesesSinPagar,
      0,
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

/*
 * Adapta registros simulados en camelCase y futuras
 * propiedades de la API expresadas en snake_case.
 */
function normalizarAportacion(
  aportacion,
) {
  if (
    !aportacion ||
    typeof aportacion !== 'object' ||
    Array.isArray(aportacion)
  ) {
    return null
  }

  try {
    const id =
      prepararTexto(
        aportacion.id ??
        aportacion.id_aportacion ??
        aportacion.id_pago,
      )

    const numeroCuenta =
      prepararTexto(
        aportacion.numeroCuenta ??
        aportacion.num_cuenta,
      )

    const cantidadMeses =
      validarCantidadMeses(
        aportacion.cantidadMeses ??
        aportacion.cantidad_meses ??
        1,
        1,
      )

    const tipo =
      cantidadMeses === 1
        ? TIPOS_APORTACION.UN_MES
        : TIPOS_APORTACION
            .VARIOS_MESES

    const fechaPago =
      validarFechaPago(
        aportacion.fechaPago ??
        aportacion.fecha_pago,
      )

    const numeroReferencia =
      validarNumeroReferencia(
        aportacion.numeroReferencia ??
        aportacion.numero_referencia ??
        aportacion.referencia,
      )

    const fechaEnvio =
      prepararTexto(
        aportacion.fechaEnvio ??
        aportacion.fecha_envio ??
        aportacion.creadaEn ??
        aportacion.creada_en ??
        aportacion.created_at,
      )

    const estado =
      normalizarEstadoAportacion(
        aportacion.estado ??
        aportacion.estado_aportacion ??
        aportacion.estado_pago,
      )

    if (
      !id ||
      !numeroCuenta ||
      !fechaEnvio ||
      Number.isNaN(
        Date.parse(fechaEnvio),
      ) ||
      !estado
    ) {
      return null
    }

    let mesAportacion = null
    let anioAportacion = null

    /*
     * Solamente los pagos individuales conservan
     * un mes y año específicos de aportación.
     */
    if (
      tipo ===
      TIPOS_APORTACION.UN_MES
    ) {
      mesAportacion =
        validarMesAportacion(
          aportacion.mesAportacion ??
          aportacion.mes_aportacion,
        )

      anioAportacion =
        validarAnioAportacion(
          aportacion.anioAportacion ??
          aportacion.anio_aportacion,
        )
    }

    return {
      id,
      numeroCuenta,
      tipo,

      mesAportacion,
      anioAportacion,
      cantidadMeses,

      /*
       * Ignoramos cualquier monto externo y lo volvemos
       * a calcular con la cuota mensual establecida.
       */
      monto:
        calcularMontoAportacion(
          cantidadMeses,
        ),

      fechaPago,
      numeroReferencia,
      fechaEnvio,
      estado,

      observacionAsebep:
        prepararTexto(
          aportacion.observacionAsebep ??
          aportacion
            .observacion_asebep ??
          aportacion.observaciones ??
          aportacion.observacion,
        ),

      comprobante:
        normalizarComprobante(
          aportacion.comprobante ??
          aportacion.archivo,
        ),
    }
  } catch {
    return null
  }
}

// Guarda la colección completa de aportaciones simuladas.
function guardarColeccion(datos) {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteAportacionesError(
      'El almacenamiento local no está disponible.',
      'ALMACENAMIENTO_NO_DISPONIBLE',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_APORTACIONES_ESTUDIANTE,
      JSON.stringify(datos),
    )
  } catch {
    throw new EstudianteAportacionesError(
      'No fue posible guardar las aportaciones del estudiante.',
      'ERROR_GUARDANDO_APORTACIONES',
    )
  }
}

/*
 * Lee los datos simulados.
 *
 * La primera consulta copia el historial inicial al almacenamiento
 * para que los nuevos comprobantes permanezcan al recargar.
 */
function leerColeccion() {
  const almacenamiento =
    obtenerAlmacenamiento()

  if (!almacenamiento) {
    throw new EstudianteAportacionesError(
      'El almacenamiento local no está disponible.',
      'ALMACENAMIENTO_NO_DISPONIBLE',
    )
  }

  try {
    const contenido =
      almacenamiento.getItem(
        CLAVE_APORTACIONES_ESTUDIANTE,
      )

    if (contenido === null) {
      const datosIniciales =
        clonarDatos(
          aportacionesEstudianteMock,
        )

      guardarColeccion(
        datosIniciales,
      )

      return datosIniciales
    }

    const datos =
      JSON.parse(contenido)

    if (!Array.isArray(datos)) {
      throw new Error()
    }

    return datos
  } catch (error) {
    if (
      error instanceof
      EstudianteAportacionesError
    ) {
      throw error
    }

    throw new EstudianteAportacionesError(
      'Los datos almacenados de las aportaciones no tienen un formato válido.',
      'APORTACIONES_ALMACENADAS_INVALIDAS',
    )
  }
}

/*
 * Obtiene la cuenta directamente de la sesión.
 *
 * El formulario nunca permitirá escribir o modificar
 * manualmente el número de cuenta.
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

  /*
   * Por ahora solamente existe información simulada
   * para la cuenta de becario configurada en el mock.
   */
  if (
    usarDatosSimulados &&
    numeroCuenta !==
      NUMERO_CUENTA_APORTACIONES_PRUEBA
  ) {
    throw new EstudianteAportacionesError(
      'La cuenta actual no corresponde al estudiante de prueba.',
      'CUENTA_SIMULADA_NO_DISPONIBLE',
    )
  }

  return numeroCuenta
}

/*
 * Ordena los registros desde el envío más reciente
 * hasta el más antiguo.
 */
function ordenarPorFechaEnvio(
  aportaciones,
) {
  return [...aportaciones].sort(
    (aportacionA, aportacionB) =>
      Date.parse(
        aportacionB.fechaEnvio,
      ) -
      Date.parse(
        aportacionA.fechaEnvio,
      ),
  )
}

/*
* Detiene de forma explícita el modo de API.
* No se inventa informacion respecto al backend hasta que se publique el contrato.
 */
function lanzarContratoApiPendiente() {
  throw new EstudianteAportacionesError(
    'El backend todavía no tiene definido el contrato del módulo de aportaciones.',
    'CONTRATO_API_PENDIENTE',
  )
}

/*
 * Construye un comprobante nuevo.
 *
 * El monto no se recibe dentro de datosFormulario:
 * siempre se calcula desde cantidadMeses.
 */
function construirNuevaAportacion({
  numeroCuenta,
  tipo,
  datosFormulario,
}) {
  const esPagoIndividual =
    tipo ===
    TIPOS_APORTACION.UN_MES

  const cantidadMeses =
    esPagoIndividual
      ? 1
      : validarCantidadMeses(
          datosFormulario
            ?.cantidadMeses,
          2,
        )

  const mesAportacion =
    esPagoIndividual
      ? validarMesAportacion(
          datosFormulario
            ?.mesAportacion,
        )
      : null

  const anioAportacion =
    esPagoIndividual
      ? validarAnioAportacion(
          datosFormulario
            ?.anioAportacion,
        )
      : null

  const fechaPago =
    validarFechaPago(
      datosFormulario?.fechaPago,
    )

  const numeroReferencia =
    validarNumeroReferencia(
      datosFormulario
        ?.numeroReferencia,
    )

  const comprobante =
    validarComprobanteImagen(
      datosFormulario?.archivo,
    )

  const nuevaAportacion = {
    id:
      crearIdentificadorAportacion(),
    numeroCuenta,
    tipo,

    mesAportacion,
    anioAportacion,
    cantidadMeses,

    /*
     * El monto permanece protegido porque se deriva
     * exclusivamente de la cantidad validada.
     */
    monto:
      calcularMontoAportacion(
        cantidadMeses,
      ),

    fechaPago,
    numeroReferencia,

    /*
     * Guardamos el instante real del envío.
     * La interfaz lo convertirá a la hora local del usuario.
     */
    fechaEnvio:
      new Date().toISOString(),

    estado:
      ESTADOS_APORTACION
        .PENDIENTE_APROBACION,

    observacionAsebep:
      'Tu aportación fue recibida correctamente y se encuentra en proceso de revisión.',

    comprobante,
  }

  const aportacionNormalizada =
    normalizarAportacion(
      nuevaAportacion,
    )

  if (!aportacionNormalizada) {
    throw new EstudianteAportacionesError(
      'No fue posible preparar la información del comprobante.',
      'COMPROBANTE_INVALIDO',
    )
  }

  return aportacionNormalizada
}

/*
 * Guarda una nueva aportación como registro independiente.
 *
 * No reemplaza comprobantes anteriores, incluso cuando
 * alguno de ellos requiere corrección.
 */
function registrarAportacionSimulada(
  nuevaAportacion,
) {
  const aportaciones =
    leerColeccion()

  const coleccionActualizada = [
    nuevaAportacion,
    ...aportaciones,
  ]

  guardarColeccion(
    coleccionActualizada,
  )

  return clonarDatos(
    nuevaAportacion,
  )
}

// Devuelve el historial completo del estudiante autenticado.
export async function listarAportacionesEstudiante() {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const datos =
    leerColeccion()

  const aportacionesNormalizadas =
    datos.map(
      normalizarAportacion,
    )

  if (
    aportacionesNormalizadas.some(
      (aportacion) => !aportacion,
    )
  ) {
    throw new EstudianteAportacionesError(
      'El historial contiene una aportación con formato inválido.',
      'HISTORIAL_INVALIDO',
    )
  }

  const historial =
    aportacionesNormalizadas.filter(
      (aportacion) =>
        aportacion.numeroCuenta ===
        numeroCuenta,
    )

  return clonarDatos(
    ordenarPorFechaEnvio(
      historial,
    ),
  )
}

/*
 * Busca un comprobante específico sin permitir consultar
 * registros pertenecientes a otra cuenta.
 */
export async function obtenerAportacionEstudiante(
  identificador,
) {
  const id =
    prepararTexto(identificador)

  if (!id) {
    throw new EstudianteAportacionesError(
      'El identificador de la aportación es obligatorio.',
      'IDENTIFICADOR_OBLIGATORIO',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const datos =
    leerColeccion()

  const aportacion =
    datos
      .map(normalizarAportacion)
      .find(
        (registro) =>
          registro?.id === id &&
          registro.numeroCuenta ===
            numeroCuenta,
      )

  return aportacion
    ? clonarDatos(aportacion)
    : null
}

/*
 * Registra el comprobante correspondiente
 * a exactamente un mes.
 */
export async function registrarAportacionUnMes(
  datosFormulario,
) {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const nuevaAportacion =
    construirNuevaAportacion({
      numeroCuenta,
      tipo:
        TIPOS_APORTACION.UN_MES,
      datosFormulario,
    })

  return registrarAportacionSimulada(
    nuevaAportacion,
  )
}

/*
 * Registra un comprobante para dos o más meses.
 *
 * La cantidad no tiene un máximo artificial:
 * después de 12, la interfaz permitirá escribirla.
 */
export async function registrarAportacionVariosMeses(
  datosFormulario,
) {
  const numeroCuenta =
    obtenerNumeroCuentaActual()

  if (!usarDatosSimulados) {
    lanzarContratoApiPendiente()
  }

  const nuevaAportacion =
    construirNuevaAportacion({
      numeroCuenta,
      tipo:
        TIPOS_APORTACION
          .VARIOS_MESES,
      datosFormulario,
    })

  return registrarAportacionSimulada(
    nuevaAportacion,
  )
}

/*
 * Restaura el historial inicial del estudiante de prueba.
 *
 * Esta operación se utilizará solamente durante desarrollo
 * para repetir manualmente los flujos del módulo.
 */
export async function restablecerAportacionesEstudiante() {
  if (!usarDatosSimulados) {
    throw new EstudianteAportacionesError(
      'El restablecimiento solo está disponible con datos simulados.',
      'RESTABLECIMIENTO_NO_DISPONIBLE',
    )
  }

  const numeroCuenta =
    obtenerNumeroCuentaActual()

  const datosIniciales =
    clonarDatos(
      aportacionesEstudianteMock,
    )
      .map(normalizarAportacion)

  if (
    datosIniciales.some(
      (aportacion) => !aportacion,
    )
  ) {
    throw new EstudianteAportacionesError(
      'Los datos iniciales de aportaciones no son válidos.',
      'MOCK_APORTACIONES_INVALIDO',
    )
  }

  const aportacionesCuenta =
    datosIniciales.filter(
      (aportacion) =>
        aportacion.numeroCuenta ===
        numeroCuenta,
    )

  guardarColeccion(
    aportacionesCuenta,
  )

  return clonarDatos(
    ordenarPorFechaEnvio(
      aportacionesCuenta,
    ),
  )
}