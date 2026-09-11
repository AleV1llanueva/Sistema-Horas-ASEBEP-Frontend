import { toast } from 'sonner'

// Duraciones utilizadas por las diferentes tipos de notificaciones de la aplicacion.
const DURACIONES = Object.freeze({
    normal: 4500,
    error: 6000,
    confirmacion: 7000,
})

/*
* Construye las opciones compartidas por Sonner.
* toasterId permite dirigir una notificacion hacia un
* Toaster especifico.
*/
function construirOpciones({
    descripcion,
    duracion,
    id,
    toasterId,
}) {
    const opciones = {
        description: descripcion,
        duration: duracion,
    }

    // Evita que varias notificaciones iguales se acumulen.
    if (id) {
        opciones.id = id
    }

    // Solamente se agrega cuando una vista necesita utilizar un Toaster diferente al global.
    if (toasterId) {
        opciones.toasterId = toasterId
    }

    return opciones
}

// Muestra una operacion completada correctamente.
export function notificarExito({
    titulo,
    descripcion,
    duracion = DURACIONES.normal,
    id,
    toasterId,
}) {
    return toast.success(
        titulo,
        construirOpciones({
            descripcion,
            duracion,
            id,
            toasterId,
        }),
    )
}

// Muestra un error que requiere atencion.
export function notificarError({
    titulo,
    descripcion,
    duracion = DURACIONES.error,
    id,
    toasterId,
}) {
    return toast.error(
        titulo,
        construirOpciones({
            descripcion,
            duracion,
            id,
            toasterId,
        }),
    )
}

// Muestra informacion relevante para el usuario.
export function notificarInformacion({
    titulo,
    descripcion,
    duracion = DURACIONES.normal,
    id,
    toasterId,
}) {
    return toast.info(
        titulo,
        construirOpciones({
            descripcion,
            duracion,
            id,
            toasterId,
        }),
    )
}

// Muestra una advertencia que el usuario debe tomar en cuenta antes de continuar.
export function notificarAdvertencia({
    titulo,
    descripcion,
    duracion = DURACIONES.normal,
    id,
    toasterId,
}) {
    return toast.warning(
        titulo,
        construirOpciones({
            descripcion,
            duracion,
            id,
            toasterId,
        }),
    )
}

// Muestra una notificacion con acciones explicitas de confirmacion y cancelacion.
export function solicitarConfirmacion({
    titulo,
    descripcion,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    alConfirmar,
    alCancelar,
    duracion = DURACIONES.confirmacion,
    id,
    toasterId,
}) {
    return toast.warning(titulo, {
        ...construirOpciones({
            descripcion,
            duracion,
            id,
            toasterId,
        }),

        // Sonner ejecuta esta funcion cuando el usuario presiona el boton principal.
        action: {
            label: textoConfirmar,
            onClick: () => {
                if (typeof alConfirmar === 'function') {
                    alConfirmar()
                }
            },
        },

        // La accion secundaria permite cancelar explicitamente la operacion.
        cancel: {
            label: textoCancelar,
            onClick: () => {
                if (typeof alCancelar === 'function') {
                    alCancelar()
                }
            },
        },
    })
}

// Cierra una notificacion especifica mediante el identificador utilizado al mostrarla.
export function limpiarNotificaciones(id) {
    toast.dismiss(id)
}