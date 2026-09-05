import {
  ROL_ADMIN_APORTACIONES,
  ROL_ADMIN_GENERAL,
  ROL_ADMIN_HORAS,
  ROL_BECARIO,
} from '../config/rutasPorRol.js'
import { guardarSesion } from '../services/sesionService.js'
import { usuarioMock } from './usuarioMock.js'

const DURACION_SESION_SEGUNDOS = 60 * 60
const RETARDO_SIMULADO_MS = 400

/*
 * Construye la información personal simulada de un
 * administrador cuando accede a su portal de becario.
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
 * Todas ingresarán desde el mismo formulario ubicado
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
 * El status permite reutilizar los mensajes del Login.
 */
export class AutenticacionMockError extends Error {
  constructor(mensaje, status) {
    super(mensaje)

    this.name = 'AutenticacionMockError'
    this.status = status
  }
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
 * utilizados por el backend y sesionService:
 *
 * - num_cuenta
 * - rol
 * - iat
 * - exp
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
 * Localiza una cuenta mediante sus credenciales.
 * La contraseña se compara exactamente como se escribió.
 */
function buscarCuenta({
  numeroCuenta,
  contrasena,
}) {
  const numeroCuentaNormalizado =
    String(numeroCuenta ?? '').trim()

  return cuentasAutenticacionMock.find(
    (cuenta) =>
      cuenta.numeroCuenta ===
        numeroCuentaNormalizado &&
      cuenta.contrasena === contrasena,
  )
}

/*
 * Devuelve la información personal simulada
 * asociada con el número de cuenta autenticado.
 */
export function obtenerUsuarioPersonalMock(
  numeroCuenta,
) {
  const numeroCuentaNormalizado =
    String(numeroCuenta ?? '').trim()

  const cuenta =
    cuentasAutenticacionMock.find(
      (cuentaMock) =>
        cuentaMock.numeroCuenta ===
        numeroCuentaNormalizado,
    )

  return cuenta?.usuarioPersonal ?? null
}

/*
 * Simula POST /auth/login para becarios y administradores.
 *
 * La respuesta generada utiliza el mismo contrato del
 * backend y guardarSesion registra el JWT utilizando
 * la sesión general de la aplicación.
 */
export async function iniciarSesionMock({
  numeroCuenta,
  contrasena,
}) {
  if (!import.meta.env.DEV) {
    throw new AutenticacionMockError(
      'El acceso simulado solamente está disponible durante el desarrollo.',
      503,
    )
  }

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
    access_token: crearJwtSimulado(cuenta),
    token_type: 'bearer',
    rol: cuenta.rol,
  }

  /*
   * Devuelve la sesión normalizada:
   * accessToken, numeroCuenta, rol y expiraEn.
   */
  return guardarSesion(respuestaLogin)
}