// Clave utilizada para identificar la sesión de ASEBEP.
const CLAVE_SESION = 'asebep_sesion'

// Error especializado para problemas relacionados con la sesión.
export class SesionError extends Error {
  constructor(mensaje) {
    super(mensaje)

    this.name = 'SesionError'
  }
}

/*
 * Obtiene sessionStorage de manera segura.
 *
 * La sesión:
 * - Permanece al recargar la página.
 * - Se elimina al cerrar la pestaña.
 */
function obtenerAlmacenamientoSesion() {
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
 * Convierte Base64URL, utilizado por JWT,
 * a texto UTF-8.
 */
function decodificarBase64Url(valor) {
  const base64 = valor
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const relleno = '='.repeat(
    (4 - (base64.length % 4)) % 4,
  )

  const contenidoBinario = window.atob(
    `${base64}${relleno}`,
  )

  const bytes = Uint8Array.from(
    contenidoBinario,
    (caracter) => caracter.charCodeAt(0),
  )

  return new TextDecoder().decode(bytes)
}

/*
 * Decodifica y valida la estructura básica del JWT.
 *
 * Importante:
 * esta función no verifica la firma criptográfica.
 * La firma y los permisos siempre deben ser validados
 * por el backend en cada solicitud protegida.
 */
function obtenerPayloadJwt(token) {
  if (
    typeof token !== 'string' ||
    !token.trim()
  ) {
    throw new SesionError(
      'La respuesta del servidor no contiene un JWT.',
    )
  }

  const partesToken = token.split('.')

  if (partesToken.length !== 3) {
    throw new SesionError(
      'El token recibido no tiene una estructura JWT válida.',
    )
  }

  try {
    const payloadTexto = decodificarBase64Url(
      partesToken[1],
    )

    const payload = JSON.parse(payloadTexto)

    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new SesionError(
        'El contenido del JWT no es válido.',
      )
    }

    return payload
  } catch (error) {
    if (error instanceof SesionError) {
      throw error
    }

    throw new SesionError(
      'No fue posible interpretar el JWT recibido.',
    )
  }
}

/*
 * Obtiene y valida el número de cuenta contenido
 * en el payload del JWT.
 *
 * El nombre del claim debe coincidir exactamente
 * con el del backend.
 */
function obtenerNumeroCuenta(payload) {
  const numeroCuenta = String(
    payload.num_cuenta ?? '',
  ).trim()

  if (!numeroCuenta) {
    throw new SesionError(
      'El JWT no contiene el número de cuenta del usuario.',
    )
  }

  if (!/^\d+$/.test(numeroCuenta)) {
    throw new SesionError(
      'El número de cuenta contenido en el JWT no es válido.',
    )
  }

  return numeroCuenta
}

// Obtiene y valida el rol contenido en el JWT.
function obtenerRol(payload) {
  const rol =
    typeof payload.rol === 'string'
      ? payload.rol.trim()
      : ''

  if (!rol) {
    throw new SesionError(
      'El JWT no contiene el rol del usuario.',
    )
  }

  return rol
}

// Comprueba que el JWT incluya una expiración válida.
function validarExpiracion(payload) {
  if (
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp)
  ) {
    throw new SesionError(
      'El JWT no contiene una fecha de expiración válida.',
    )
  }

  if (payload.exp * 1000 <= Date.now()) {
    throw new SesionError(
      'La sesión recibida ya se encuentra vencida.',
    )
  }
}

/*
 * Guarda la sesión recibida desde el login.
 *
 * El backend responde con:
 * - access_token
 *
 * Dentro del frontend utilizamos:
 * - accessToken
 */
export function guardarSesion(respuestaLogin) {
  const token = String(
    respuestaLogin?.access_token ?? '',
  ).trim()

  const payload = obtenerPayloadJwt(token)

  validarExpiracion(payload)

  const sesion = {
    accessToken: token,
    tipoToken: 'Bearer',
    numeroCuenta: obtenerNumeroCuenta(payload),
    rol: obtenerRol(payload),
    expiraEn: payload.exp,
  }

  const almacenamiento =
    obtenerAlmacenamientoSesion()

  if (!almacenamiento) {
    throw new SesionError(
      'El almacenamiento de sesión no está disponible.',
    )
  }

  try {
    almacenamiento.setItem(
      CLAVE_SESION,
      JSON.stringify(sesion),
    )
  } catch {
    throw new SesionError(
      'No fue posible guardar la sesión en el navegador.',
    )
  }

  return sesion
}

/*
 * Recupera y vuelve a validar la sesión.
 *
 * Los datos de identidad se reconstruyen desde el JWT
 * para no confiar en los valores adicionales que puedan
 * existir dentro de sessionStorage.
 */
export function obtenerSesion() {
  const almacenamiento =
    obtenerAlmacenamientoSesion()

  if (!almacenamiento) {
    return null
  }

  try {
    const sesionGuardada =
      almacenamiento.getItem(CLAVE_SESION)

    if (!sesionGuardada) {
      return null
    }

    const sesion = JSON.parse(sesionGuardada)

    if (
      !sesion ||
      typeof sesion !== 'object' ||
      Array.isArray(sesion)
    ) {
      throw new SesionError(
        'La sesión almacenada no es válida.',
      )
    }

    const token = sesion.accessToken
    const payload = obtenerPayloadJwt(token)

    validarExpiracion(payload)

    return {
      accessToken: token,
      tipoToken: 'Bearer',
      numeroCuenta: obtenerNumeroCuenta(payload),
      rol: obtenerRol(payload),
      expiraEn: payload.exp,
    }
  } catch {
    limpiarSesion()

    return null
  }
}

// Devuelve únicamente el JWT.
export function obtenerTokenAcceso() {
  return obtenerSesion()?.accessToken ?? null
}

// Devuelve el número de cuenta del usuario autenticado.
export function obtenerNumeroCuentaSesion() {
  return obtenerSesion()?.numeroCuenta ?? null
}

// Devuelve el rol del usuario autenticado.
export function obtenerRolSesion() {
  return obtenerSesion()?.rol ?? null
}

// Elimina la sesión almacenada en el navegador.
export function limpiarSesion() {
  const almacenamiento =
    obtenerAlmacenamientoSesion()

  if (!almacenamiento) {
    return
  }

  try {
    almacenamiento.removeItem(CLAVE_SESION)
  } catch {
    // No lanzamos otro error durante el cierre de sesión.
  }
}