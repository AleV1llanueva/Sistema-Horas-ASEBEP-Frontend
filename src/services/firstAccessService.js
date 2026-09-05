import { apiFetch } from './api.js'

/*
* Normaliza el numero de cuenta antes de enviarlo.
*/
function normalizarNumeroCuenta(numeroCuenta) {
    return String(numeroCuenta ?? '').trim()
}

/*
* Solicita el PIN de primer ingreso.
*
* El backend busca el correo institucional asociado al
* numero de cuenta y envia automaticamente el PIN.
*/
export async function solicitarPinPrimerIngreso({
    numeroCuenta,
}) {
    return apiFetch('/auth/pin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            num_cuenta:
                normalizarNumeroCuenta(numeroCuenta),
        }),
    })
}

/*
* Envia el PIN y la primera contraseña al backend.
*
* Si el PIN es válido, el backend guarda la contraseña,
* activa la cuenta y devuelve un mensaje de confirmacion.
*/
export async function activarCuentaPrimerIngreso({
    numeroCuenta,
    pin,
    nuevaContrasena,
}) {
    return apiFetch('/auth/activar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            num_cuenta: normalizarNumeroCuenta(numeroCuenta),
            pin: String(pin ?? '').trim(),
            nueva_password: nuevaContrasena,
        }),
    })
}