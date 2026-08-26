import { useNavigate } from 'react-router'
import { useUsuario } from './useUsuario'
import {
    limpiarNotificaciones,
    notificarExito,
    solicitarConfirmacion,
} from '../services/notificationService.js'

// Identificadores unicos para las notificaciones
const ID_CONFIRMACION_CIERRE = 'confirmacion-cierre-sesion'
const ID_SESION_CERRADA = 'sesion-cerrada'

// Centraliza todo el proceso de cierre de sesion (MobileNavigarion and AppSidebar)
export function useCerrarSesion() {
    const navigate = useNavigate()
    const { limpiarUsuario } = useUsuario()

    // Ejecuta el cierre de sesion al recibir confirmacion del usuario
    function cerrarSesion() {
        limpiarNotificaciones(
            ID_CONFIRMACION_CIERRE,
        )
        
        limpiarUsuario()
        navigate('/login', {
            replace: true,
        })

        // Informamos el cierre de sesion exitoso
        notificarExito({
            id: ID_SESION_CERRADA,
            titulo: 'Sesión cerrada',
            descripcion:
                'Has salido correctamente del portal ASEBEP.',
        })
    }

    // Solicita confirmacion antes de ejecutar una accion sensible
    function solicitarCierreSesion() {
        solicitarConfirmacion({
            id: ID_CONFIRMACION_CIERRE,
            titulo: '¿Cerrar sesión?',
            descripcion: 'Tendrás que ingresar nuevamente para acceder al portal.',
            textoConfirmar: 'Confirmar',
            alConfirmar: cerrarSesion,
        })
    }

    return {
        solicitarCierreSesion,
    }
}