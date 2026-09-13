import {
  ROL_ADMIN_APORTACIONES,
  ROL_ADMIN_GENERAL,
  ROL_ADMIN_HORAS,
  ROL_BECARIO,
} from '../config/rutasPorRol.js'
import {
  guardarSesion,
} from '../services/sesionService.js'
import { usuarioMock } from './usuarioMock.js'

const DURACION_SESION_SEGUNDOS = 60 * 60
const RETARDO_SIMULADO_MS = 400

// Configuración del cambio de contraseña simulado.
const PIN_CAMBIO_CONTRASENA_MOCK = '123456'
const DURACION_PIN_MOCK_MS = 15 * 60 * 1000
const LIMITE_PINES_DIARIOS_MOCK = 2

/*
 * Claves independientes de la sesión principal.
 *
 * sessionStorage permite que la contraseña modificada
 * continúe funcionando mientras la pestaña permanezca abierta.
 */
const CLAVE_CONTRASENAS_MOCK =
  'asebep_contrasenas_mock'

const CLAVE_PINES_MOCK =
  'asebep_pines_cambio_mock'

const CLAVE_INTENTOS_PIN_MOCK =
  'asebep_intentos_pin_mock'

/*
* Construye la identidad simulada por el encabezado
* y el perfil del panel administrativo.
 */
function crearUsuarioAdministradorMock({
  numeroCuenta,
  rol,
  area,
}) {
  return {
    credenciales: {
      rol,
      activo: true,
    },

    datosPersonales: {
      ...usuarioMock.datosPersonales,
      numeroCuenta,
      primerNombre: 'Administrador',
      segundoNombre: 'De',
      primerApellido: area,
      segundoApellido: 'ASEBEP',
      nombreCompleto:
        `Administrador de ${area} ASEBEP`,
      correoPersonal:
        `${numeroCuenta}@example.com`,
      correoInstitucional:
        `${numeroCuenta}@unah.hn`,
    },

    /*
     * Los administradores también son beneficiarios,
     * por lo que conservan información de becario.
     */
    datosBecario: {
      ...usuarioMock.datosBecario,
    },
  }
}

/*
 * Cuentas disponibles únicamente durante el desarrollo.
 *
 * Todas ingresan desde el mismo formulario ubicado
 * en la ruta /login.
 */
export const cuentasAutenticacionMock =
  Object.freeze([
    Object.freeze({
      numeroCuenta: '20249999999',
      contrasena: 'AsebepBeta2026!',
      rol: ROL_BECARIO,
      activo: true,
      usuarioPersonal: usuarioMock,
    }),

    Object.freeze({
      numeroCuenta: '20260000001',
      contrasena: 'AdminGeneral2026*',
      rol: ROL_ADMIN_GENERAL,
      activo: true,
      usuarioPersonal:
        crearUsuarioAdministradorMock({
          numeroCuenta: '20260000001',
          rol: ROL_ADMIN_GENERAL,
          area: 'Administración General',
        }),
    }),

    Object.freeze({
      numeroCuenta: '20260000002',
      contrasena:
        'AdminAportaciones2026*',
      rol: ROL_ADMIN_APORTACIONES,
      activo: true,
      usuarioPersonal:
        crearUsuarioAdministradorMock({
          numeroCuenta: '20260000002',
          rol: ROL_ADMIN_APORTACIONES,
          area: 'Aportaciones',
        }),
    }),

    Object.freeze({
      numeroCuenta: '20260000003',
      contrasena: 'AdminHoras2026*',
      rol: ROL_ADMIN_HORAS,
      activo: true,
      usuarioPersonal:
        crearUsuarioAdministradorMock({
          numeroCuenta: '20260000003',
          rol: ROL_ADMIN_HORAS,
          area: 'Horas',
        }),
    }),
  ])

/*
 * Error similar al que puede producir la API.
 * El status permite reutilizar los mensajes del frontend.
 */
export class AutenticacionMockError extends Error {
  constructor(mensaje, status) {
    super(mensaje)

    this.name = 'AutenticacionMockError'
    this.status = status
  }
}

/*
 * Obtiene sessionStorage de forma segura.
 */
function obtenerAlmacenamientoMock() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/*
 * Lee un objeto JSON desde sessionStorage.
 *
 * Si no existe o está dañado, devuelve un objeto vacío
 * para que el modo simulado pueda recuperarse.
 */
function leerRegistroMock(clave) {
  const almacenamiento =
    obtenerAlmacenamientoMock()

  if (!almacenamiento) {
    return {}
  }

  try {
    const contenido =
      almacenamiento.getItem(clave)

    if (!contenido) {
      return {}
    }

    const registro = JSON.parse(contenido)

    if (
      !registro ||
      typeof registro !== 'object' ||
      Array.isArray(registro)
    ) {
      return {}
    }

    return registro
  } catch {
    return {}
  }
}

/*
 * Guarda un objeto JSON en sessionStorage.
 */
function guardarRegistroMock(
  clave,
  registro,
) {
  const almacenamiento =
    obtenerAlmacenamientoMock()

  if (!almacenamiento) {
    throw new AutenticacionMockError(
      'El almacenamiento de sesión no está disponible.',
      500,
    )
  }

  try {
    almacenamiento.setItem(
      clave,
      JSON.stringify(registro),
    )
  } catch {
    throw new AutenticacionMockError(
      'No fue posible guardar los datos simulados.',
      500,
    )
  }
}

/*
 * Comprueba que el mock solamente sea utilizado
 * durante el desarrollo local.
 */
function validarEntornoDesarrollo() {
  if (!import.meta.env.DEV) {
    throw new AutenticacionMockError(
      'La autenticación simulada solamente está disponible durante el desarrollo.',
      503,
    )
  }
}

/*
 * Localiza una cuenta utilizando únicamente
 * su número de cuenta.
 */
function buscarCuentaPorNumeroCuenta(
  numeroCuenta,
) {
  const numeroCuentaNormalizado =
    String(numeroCuenta ?? '').trim()

  return cuentasAutenticacionMock.find(
    (cuenta) =>
      cuenta.numeroCuenta ===
      numeroCuentaNormalizado,
  )
}

/*
 * Obtiene la contraseña actual de una cuenta.
 *
 * Si fue modificada mediante el modal, utilizamos
 * la nueva contraseña guardada durante esta pestaña.
 */
function obtenerContrasenaActualMock(
  cuenta,
) {
  const contrasenasModificadas =
    leerRegistroMock(
      CLAVE_CONTRASENAS_MOCK,
    )

  const contrasenaModificada =
    contrasenasModificadas[
      cuenta.numeroCuenta
    ]

  return typeof contrasenaModificada ===
    'string'
    ? contrasenaModificada
    : cuenta.contrasena
}

/*
 * Localiza una cuenta mediante sus credenciales.
 * La contraseña se compara exactamente como se escribió.
 */
function buscarCuenta({
  numeroCuenta,
  contrasena,
}) {
  const cuenta =
    buscarCuentaPorNumeroCuenta(
      numeroCuenta,
    )

  if (!cuenta) {
    return null
  }

  const contrasenaActual =
    obtenerContrasenaActualMock(cuenta)

  return contrasenaActual === contrasena
    ? cuenta
    : null
}

/*
 * Convierte un texto al formato Base64URL utilizado
 * por las distintas partes de un JWT.
 */
function codificarBase64Url(valor) {
  return window
    .btoa(valor)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

/*
 * Genera un JWT simulado con los mismos claims
 * utilizados por el backend y sesionService.
 */
function crearJwtSimulado(cuenta) {
  const momentoActual =
    Math.floor(Date.now() / 1000)

  const encabezado = {
    alg: 'none',
    typ: 'JWT',
  }

  const payload = {
    num_cuenta: cuenta.numeroCuenta,
    rol: cuenta.rol,
    iat: momentoActual,
    exp:
      momentoActual +
      DURACION_SESION_SEGUNDOS,
  }

  const encabezadoCodificado =
    codificarBase64Url(
      JSON.stringify(encabezado),
    )

  const payloadCodificado =
    codificarBase64Url(
      JSON.stringify(payload),
    )

  const firmaSimulada =
    codificarBase64Url('firma-simulada')

  return [
    encabezadoCodificado,
    payloadCodificado,
    firmaSimulada,
  ].join('.')
}

// Simula el tiempo de respuesta de una petición HTTP.
function esperarRespuestaSimulada() {
  return new Promise((resolver) => {
    window.setTimeout(
      resolver,
      RETARDO_SIMULADO_MS,
    )
  })
}

/*
 * Valida la contraseña utilizando las mismas reglas
 * declaradas actualmente por el backend.
 */
function validarNuevaContrasenaMock(
  nuevaContrasena,
) {
  const contrasena =
    String(nuevaContrasena ?? '')

  if (contrasena.length < 8) {
    throw new AutenticacionMockError(
      'La contraseña debe tener al menos 8 caracteres.',
      422,
    )
  }

  if (!/[A-Z]/.test(contrasena)) {
    throw new AutenticacionMockError(
      'La contraseña debe tener al menos una mayúscula.',
      422,
    )
  }

  if (!/[a-z]/.test(contrasena)) {
    throw new AutenticacionMockError(
      'La contraseña debe tener al menos una minúscula.',
      422,
    )
  }

  if (!/\d/.test(contrasena)) {
    throw new AutenticacionMockError(
      'La contraseña debe tener al menos un número.',
      422,
    )
  }

  return contrasena
}

/*
 * Devuelve la información personal simulada
 * asociada con el número de cuenta autenticado.
 */
export function obtenerUsuarioPersonalMock(
  numeroCuenta,
) {
  const cuenta =
    buscarCuentaPorNumeroCuenta(
      numeroCuenta,
    )

  return cuenta?.usuarioPersonal ?? null
}

/*
 * Simula POST /auth/login para becarios y administradores.
 */
export async function iniciarSesionMock({
  numeroCuenta,
  contrasena,
}) {
  validarEntornoDesarrollo()

  await esperarRespuestaSimulada()

  const cuenta = buscarCuenta({
    numeroCuenta,
    contrasena,
  })

  if (!cuenta) {
    throw new AutenticacionMockError(
      'El número de cuenta o la contraseña son incorrectos.',
      401,
    )
  }

  if (!cuenta.activo) {
    throw new AutenticacionMockError(
      'La cuenta se encuentra inactiva.',
      401,
    )
  }

  const respuestaLogin = {
    access_token:
      crearJwtSimulado(cuenta),
    token_type: 'bearer',
    rol: cuenta.rol,
  }

  return guardarSesion(respuestaLogin)
}

/*
 * Simula POST /auth/password/pin.
 *
 * El PIN utilizado en desarrollo es 123456,
 * vence después de 15 minutos y solamente pueden
 * solicitarse dos PIN durante el mismo día.
 */
export async function solicitarPinCambioContrasenaMock({
  numeroCuenta,
}) {
  validarEntornoDesarrollo()

  await esperarRespuestaSimulada()

  const cuenta =
    buscarCuentaPorNumeroCuenta(
      numeroCuenta,
    )

  if (!cuenta) {
    throw new AutenticacionMockError(
      'Usuario no encontrado.',
      404,
    )
  }

  if (!cuenta.activo) {
    throw new AutenticacionMockError(
      'Esta cuenta no está activada.',
      400,
    )
  }

  const fechaActual =
    new Date().toISOString().slice(0, 10)

  const intentos =
    leerRegistroMock(
      CLAVE_INTENTOS_PIN_MOCK,
    )

  const intentosCuenta =
    intentos[cuenta.numeroCuenta]

  const cantidadIntentos =
    intentosCuenta?.fecha === fechaActual
      ? Number(intentosCuenta.cantidad) || 0
      : 0

  if (
    cantidadIntentos >=
    LIMITE_PINES_DIARIOS_MOCK
  ) {
    throw new AutenticacionMockError(
      'Límite de PINs diarios alcanzado. Intenta nuevamente mañana.',
      429,
    )
  }

  const nuevaCantidad =
    cantidadIntentos + 1

  intentos[cuenta.numeroCuenta] = {
    fecha: fechaActual,
    cantidad: nuevaCantidad,
  }

  guardarRegistroMock(
    CLAVE_INTENTOS_PIN_MOCK,
    intentos,
  )

  /*
   * Guardar un PIN nuevo reemplaza cualquier PIN
   * solicitado anteriormente para esta cuenta.
   */
  const pines =
    leerRegistroMock(CLAVE_PINES_MOCK)

  pines[cuenta.numeroCuenta] = {
    pin: PIN_CAMBIO_CONTRASENA_MOCK,
    expiraEn:
      Date.now() +
      DURACION_PIN_MOCK_MS,
  }

  guardarRegistroMock(
    CLAVE_PINES_MOCK,
    pines,
  )

  const esUltimoPin =
    nuevaCantidad >=
    LIMITE_PINES_DIARIOS_MOCK

  return {
    mensaje: esUltimoPin
      ? 'PIN de prueba: 123456. Este es tu último PIN disponible hoy.'
      : 'PIN de prueba enviado: 123456.',
  }
}

/*
 * Simula POST /auth/password/nueva.
 *
 * Si el PIN y la contraseña son válidos, guarda
 * la contraseña nueva para futuros inicios de sesión
 * realizados durante esta pestaña.
 */
export async function actualizarContrasenaConPinMock({
  numeroCuenta,
  pin,
  nuevaContrasena,
}) {
  validarEntornoDesarrollo()

  await esperarRespuestaSimulada()

  const cuenta =
    buscarCuentaPorNumeroCuenta(
      numeroCuenta,
    )

  if (!cuenta) {
    throw new AutenticacionMockError(
      'Usuario no encontrado.',
      404,
    )
  }

  if (!cuenta.activo) {
    throw new AutenticacionMockError(
      'Cuenta no activada.',
      400,
    )
  }

  const pines =
    leerRegistroMock(CLAVE_PINES_MOCK)

  const pinGuardado =
    pines[cuenta.numeroCuenta]

  if (!pinGuardado) {
    throw new AutenticacionMockError(
      'PIN inválido.',
      400,
    )
  }

  if (
    Number(pinGuardado.expiraEn) <=
    Date.now()
  ) {
    delete pines[cuenta.numeroCuenta]

    guardarRegistroMock(
      CLAVE_PINES_MOCK,
      pines,
    )

    throw new AutenticacionMockError(
      'PIN expirado, solicita uno nuevo.',
      400,
    )
  }

  const pinNormalizado =
    String(pin ?? '').trim()

  if (
    pinNormalizado !==
    pinGuardado.pin
  ) {
    throw new AutenticacionMockError(
      'PIN inválido.',
      400,
    )
  }

  const contrasenaValidada =
    validarNuevaContrasenaMock(
      nuevaContrasena,
    )

  const contrasenasModificadas =
    leerRegistroMock(
      CLAVE_CONTRASENAS_MOCK,
    )

  contrasenasModificadas[
    cuenta.numeroCuenta
  ] = contrasenaValidada

  guardarRegistroMock(
    CLAVE_CONTRASENAS_MOCK,
    contrasenasModificadas,
  )

  /*
   * El PIN solamente puede utilizarse una vez.
   */
  delete pines[cuenta.numeroCuenta]

  guardarRegistroMock(
    CLAVE_PINES_MOCK,
    pines,
  )

  return {
    mensaje:
      'Contraseña cambiada exitosamente.',
  }
}