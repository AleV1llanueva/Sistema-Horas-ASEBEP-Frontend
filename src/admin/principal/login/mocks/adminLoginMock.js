/*
* Administradores simulados para probar el acceso a las
* tres areas administrativas.
*/

const DURACION_SESION_SEGUNDOS = 60 * 60
const RETARDO_SIMULADO_MS = 400

export const administradoresLoginMock = Object.freeze([
    Object.freeze({
        numeroCuenta: '20260000001',
        contrasena: 'AdminGeneral2026*',
        rol: 'Admin General',
        activo: true,
    }),

    Object.freeze({
        numeroCuenta: '20260000002',
        contrasena: 'AdminAportaciones2026*',
        rol: 'Admin Aportaciones',
        activo: true,
    }),

    Object.freeze({
        numeroCuenta: '20260000003',
        contrasena: 'AdminHoras2026*',
        rol: 'Admin Horas',
        activo: true,
    }),
])

/*
* Error utilizado por el mock para imitar los errores HTTP
* que puede devolver el backend durante el inicio de sesión.
*/
export class AdminLoginMockError extends Error {
    constructor(mensaje, status) {
        super(mensaje)

        this.name = 'AdminLoginMockError'
        this.status = status
    }
}

/*
* Convierte un texto al formato Base64URL utilizado
* por las diferentes partes de un JWT.
*/
function codificarBase64Url(valor) {
    return window
        .btoa(valor)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '')
}

/*
* Construye un JWT simulado con los mismos claims que
* espera actualmente sesionService
*/
function crearJwtSimulado(administrador) {
    const momentoActual = Math.floor(Date.now() / 1000)

    const encabezado = {
        alg: 'none',
        typ: 'JWT',
    }

    const payload = {
        num_cuenta: administrador.numeroCuenta,
        rol: administrador.rol,
        iat: momentoActual,
        exp: momentoActual + DURACION_SESION_SEGUNDOS,
    }

    const encabezadoCodificado = codificarBase64Url(
        JSON.stringify(encabezado),
    )

    const payloadCodificado = codificarBase64Url(
        JSON.stringify(payload),
    )

    /*
    * sesionService espera tres partes separadas por puntos.
    */

    const firmaSimulada = codificarBase64Url(
        'firma-simulada',
    )

    return [
        encabezadoCodificado,
        payloadCodificado,
        firmaSimulada,
    ].join('.')
}

/*
* Agrega una espera breve para reproducir el comportamiento
* de una peticion HTTP y permitir visualizar el estado de carga.
*/
function esperarRespuestaSimulada() {
    return new Promise((resolver) => {
        window.setTimeout(
            resolver,
            RETARDO_SIMULADO_MS,
        )
    })
}

/*
* Busca un administrador usando su numero de cuenta.
* La contraseña se compara exactamente como fue escrita:
* no se eliminan espacios ni se cambia su capitalizacion.
*/
function buscarAdministrador({
    numeroCuenta,
    contrasena,
}) {
    const numeroCuentaNormalizado = String(
        numeroCuenta ?? '',
    ).trim()

    return administradoresLoginMock.find(
        (administrador) =>
            administrador.numeroCuenta === numeroCuentaNormalizado &&
        administrador.contrasena === contrasena,
    )
}

/*
* Simula POST /auth/login para administradores.
*
* Si las credenciales son correctas, devuelve una respuesta
* equivalente a la proporcionada por el backend. El servicio
* de sesión sera responsable de decodificar y guardar el JWT.
*/
export async function iniciarSesionAdminMock({
    numeroCuenta,
    contrasena,
}) {
    if (!import.meta.env.DEV) {
        throw new AdminLoginMockError(
            'El acceso administrativo simulado solo está disponible durante el desarrollo.',
            503,
        )
    }

    await esperarRespuestaSimulada()

    const administrador = buscarAdministrador({
        numeroCuenta,
        contrasena,
    })

    if (!administrador) {
        throw new AdminLoginMockError(
            'El número de cuenta o la contraseña son incorrectos.',
            401,
        )
    }

    if (!administrador.activo) {
        throw new AdminLoginMockError(
            'La cuenta administrativa se encuentra inactiva.',
            403,
        )
    }

    const accessToken = crearJwtSimulado(administrador)

    /*
    - "rol" tambien se incluye en el nivel superior para imitar
    - la respuesta indicada por el backend. Sin embargo, el
    - frontend obtendra el rol autorizado desde el JWT.
    */
   return {
    access_token: accessToken,
    token_type: 'bearer',
    rol: administrador.rol,
   }
}