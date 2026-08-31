import {
    useLocation,
    useNavigate,
} from 'react-router'

import {
    cerrarSesionAdmin,
} from '../admin/principal/login/services/adminAuthService.js'

import { useUsuario } from './useUsuario.js'
import {
    limpiarNotificaciones,
    notificarExito,
    solicitarConfirmacion,
} from '../services/notificationService.js'

// Identificadores unicos para las notificaciones
const ID_CONFIRMACION_CIERRE = 'confirmacion-cierre-sesion'
const ID_SESION_CERRADA = 'sesion-cerrada'

const RUTA_LOGIN_USUARIO = '/login'
const RUTA_LOGIN_ADMIN = '/login-admin'

// Estas son las raices de las diferentes areas administrativas del sistema.
const RUTAS_ADMINISTRATIVAS = [
    '/admin-principal',
    '/admin-aportaciones',
    '/admin-horas',
]

/*
* Determina si el cierre de sesion se esta ejecutando desde alguna de las areas administrativas.
*/
function esRutaAdministrativa(pathname) {
    return RUTAS_ADMINISTRATIVAS.some(
        (rutaAdministrativa) =>
            pathname === rutaAdministrativa || pathname.startsWith(
                `${rutaAdministrativa}/`,
            ),
    )
}

/*
* Centraliza el cierre de sesion tanto para el portal de becarios
* como para el portal administrativo.
*/
export function useCerrarSesion() {
    const navigate = useNavigate()
    const location = useLocation()
    const { limpiarUsuario } = useUsuario()

    const cierreAdministrativo = esRutaAdministrativa(
        location.pathname,
    )

    // Elimina la sesion correspondiente y redirige hacia el login correcto.
    function cerrarSesion() {
        limpiarNotificaciones(
            ID_CONFIRMACION_CIERRE,
        )

        // El login administrativo utiliza el mismo almacenamiento JWT, pero tiene su propio metodo de limpieza.
        if (cierreAdministrativo) {
            cerrarSesionAdmin()
        }

        // Tambien limpiamos el estado mantenido por UsuarioContexto para evitar residuos de datos.
        limpiarUsuario()
        const rutaDestino =
            cierreAdministrativo
                ? RUTA_LOGIN_ADMIN
                : RUTA_LOGIN_USUARIO

        navigate(rutaDestino, {
            replace: true,
        })

        notificarExito({
            id: ID_SESION_CERRADA,
            titulo: 'Sesión cerrada',
            descripcion:
                'Has salido correctamente del portal ASEBEP.',
        })
    }

    // Solicita confirmación antes de cerrar la sesión.
    function solicitarCierreSesion() {
        solicitarConfirmacion({
            id: ID_CONFIRMACION_CIERRE,
            titulo: '¿Cerrar sesión?',
            descripcion:
                'Tendrás que ingresar nuevamente para acceder al portal.',
            textoConfirmar: 'Confirmar',
            alConfirmar: cerrarSesion,
        })
    }

    return {
        solicitarCierreSesion,
    }
}