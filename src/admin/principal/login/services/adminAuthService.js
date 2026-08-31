import { apiFetch } from '../../../../services/api.js'
import {
    guardarSesion,
    limpiarSesion,
} from '../../../../services/sesionService.js'

import {
    iniciarSesionAdminMock,
} from '../mocks/adminLoginMock.js'

/*
* Relaciona cada rol administrativos del JWT con la
* primera página a la que puede ingresar.
*/

export const RUTAS_ADMIN_POR_ROL = Object.freeze({
    'Admin General':
        '/admin-principal/dashboard',

    'Admin Aportaciones':
        '/admin-aportaciones/dashboard',

    'Admin Horas':
        '/admin-horas/dashboard',
})

/*
* El mock solamente se habilita durante el desarrollo
* y cuando la variable correspondiente contiene "true".
* 
* En cualquier otro caso se utiliza el backend real.
*/
const usarLoginAdminSimulado =
    import.meta.env.DEV && import.meta.env.VITE_USAR_LOGIN_ADMIN_SIMULADO === 'true'

/*
* Error especifico para situaciones en las que el JWT es válido
* pero no autoriza el acceso administrativo.
*/
export class AdminAuthError extends Error {
    constructor(
        mensaje,
        codigo,
        status = 403,
    ) {
        super(mensaje)

        this.name = 'AdminAuthError'
        this.codigo = codigo
        this.status = status
    }
}

// Normaliza el rol antes de buscar su ruta.
export function obtenerRutaInicialAdmin(rol) {
    const rolNormalizado = String(
        rol ?? '',
    ).trim()

    const rolRegistrado = Object.prototype.hasOwnProperty.call(
        RUTAS_ADMIN_POR_ROL,
        rolNormalizado,
    )

    if (!rolRegistrado) {
        return null
    }

    return RUTAS_ADMIN_POR_ROL[
        rolNormalizado
    ]
}

// Permite comprobar si un rol pertenece a cualquiera de las 3 areas administrativas autorizadas.
export function esRolAdministrativo(rol) {
    return Boolean(
        obtenerRutaInicialAdmin(rol),
    )
}

/*
* Envia las credenciales al mock o al backend real.
* Ambos caminos deben devolver el mismo contrato:
* {
*   access_token,
*   token_type,
*   rol
* }
*/
async function solicitarInicioSesionAdmin({
    numeroCuenta,
    contrasena,
}) {
    if (usarLoginAdminSimulado) {
        return iniciarSesionAdminMock({
            numeroCuenta,
            contrasena,
        })
    }

    return apiFetch(
        '/auth/login',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                num_cuenta: numeroCuenta,
                password: contrasena,
            }),
        },
    )
}

// Ejecuta el flujo completo de autenticación
export async function iniciarSesionAdmin({
    numeroCuenta,
    contrasena,
}) {
    const numeroCuentaNormalizado = String(
        numeroCuenta ?? '',
    ).trim()

    const respuestaLogin = await solicitarInicioSesionAdmin({
        numeroCuenta: numeroCuentaNormalizado,

        // La contraseña no se recorta ni transforma.
        contrasena: String(contrasena ?? ''),
    })

    /*
    * guardarSesion obtiene num_cuenta, rol y exp
    * directamente desde el payload del JWT.
    */
   const sesion = guardarSesion(respuestaLogin)

   // El numero de cuenta del formulario debe coincidir con el claim num_cuenta contenido en el JWT.
   if (
    sesion.numeroCuenta !== numeroCuentaNormalizado
   ) {
    limpiarSesion()

    throw new AdminAuthError(
        'La cuenta del JWT no coincide con la cuenta utilizada para iniciar sesión.',
        'CUENTA_JWT_NO_COINCIDE',
    )
   }

   /*
   * Un JWT de estudiante u otro rol desconocido no puede
   * utilizarse para entra al portal administrativo.
   */
  if (!esRolAdministrativo(sesion.rol)) {
    limpiarSesion()

    throw new AdminAuthError(
        'No tienes permisos para ingresar al portal administrativo.',
        'ROL_NO_ADMINISTRATIVO',
    )
  }

  const rutaInicio = obtenerRutaInicialAdmin(sesion.rol)

  return {
    ...sesion,
    rutaInicio,
  }
}

/*
- El cierre de sesion administrativo elimina el mismo
- JWT almacenado por el servicio de sesion general.
*/
export function cerrarSesionAdmin() {
    limpiarSesion()
}