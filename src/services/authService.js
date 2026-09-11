import {
    actualizarContrasenaConPinMock,
    solicitarPinCambioContrasenaMock,
} from '../mocks/autenticacionMock.js'

import { apiFetch } from './api.js'
import {
    guardarSesion,
    limpiarSesion,
} from './sesionService.js'

/*
* EL modo simulado solamente puede funcionar durante
* el desarrollo y cuando la variable este activada.
*/
const usarDatosSimulados =
    import.meta.env.DEV &&
    import.meta.env.VITE_USAR_DATOS_SIMULADOS === 'true'

    /*
    * Normaliza el numero de cuenta antes de utilizarlo
    * en una solicitud real o simulada.
    */
   function normalizarNumeroCuenta(
    numeroCuenta,
   ) {
    return String(numeroCuenta ?? '').trim()
   }

   // Envia las credenciales del formulario al backend.
   export async function iniciarSesion({
    numeroCuenta,
    contrasena,
   }) {
    const numeroCuentaNormalizado =
        normalizarNumeroCuenta(numeroCuenta)
    const respuestaLogin = await apiFetch(
        '/auth/login',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_cuenta: numeroCuentaNormalizado,
                password: contrasena,
            }),
        },
    )

    /*
    * guardarSesion:
    * 1. Extrae el JWT de access_token.
    * 2. Decodifica su payload.
    * 3. Obtiene num_cuenta, rol y exp.
    * 4. Guarda la sesion en sessionStorage.
    */
   return guardarSesion(respuestaLogin)
   }

   /*
   * Solicita el PIN necesario para cambiar la contraseña.
   - El backend obtiene el correo institucional asociado al numero de cuenta
   - y envia automaticamente el PIN.
   */
  export async function solicitarPinCambioContrasena({
    numeroCuenta,
  }) {
    const numeroCuentaNormalizado = normalizarNumeroCuenta(numeroCuenta)

    // En desarrollo utilizamos el PIN simulado 123456. En produccion siempre se consulta al backend.
    if (usarDatosSimulados) {
        return solicitarPinCambioContrasenaMock({
            numeroCuenta: numeroCuentaNormalizado,
        })
    }

    return apiFetch(
        '/auth/password/pin',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            num_cuenta: numeroCuentaNormalizado,
        }),
        },
    )
}

// Envia el PIN y la contraseña nueva.
export async function actualizarContrasenaConPin({
    numeroCuenta,
    pin,
    nuevaContrasena,
}) {
    const numeroCuentaNormalizado = normalizarNumeroCuenta(numeroCuenta)
    const pinNormalizado = String(pin ?? '').trim()

    // La contraseña no se recorta ni se transforma, se envia como fue escrita.
    const contrasena = String(nuevaContrasena ?? '')

    if (usarDatosSimulados) {
        return actualizarContrasenaConPinMock({
            numeroCuenta: numeroCuentaNormalizado,
            pin: pinNormalizado,
            nuevaContrasena: contrasena,
        })
    }

    return apiFetch(
        '/auth/password/nueva',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                num_cuenta: numeroCuentaNormalizado,
                pin: pinNormalizado,
                nueva_password: contrasena,
            }),
        },
    )
}
/*
* Cerrar sesión elimina unicamente el JWT almacenado.
*
* La contraseña modificada permanece disponible en el backend
* o el almacenamiento simulado.
*/
export function cerrarSesion() {
    limpiarSesion()
}