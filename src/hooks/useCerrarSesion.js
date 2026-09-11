import { useNavigate } from 'react-router'

import { useUsuario } from './useUsuario.js'
import {
  limpiarNotificaciones,
  notificarExito,
  solicitarConfirmacion,
} from '../services/notificationService.js'
import {
  limpiarSesion,
} from '../services/sesionService.js'

// Identificadores únicos para las notificaciones.
const ID_CONFIRMACION_CIERRE =
  'confirmacion-cierre-sesion'

const ID_SESION_CERRADA =
  'sesion-cerrada'

const RUTA_LOGIN = '/login'

/*
 * Centraliza el cierre de sesión para el portal
 * personal y todas las áreas administrativas.
 */
export function useCerrarSesion() {
  const navigate = useNavigate()
  const { limpiarUsuario } = useUsuario()

  /*
   * Elimina tanto el JWT general como cualquier
   * estado personal o simulado mantenido por React.
   */
  function cerrarSesion() {
    limpiarNotificaciones(
      ID_CONFIRMACION_CIERRE,
    )

    /*
     * limpiarSesion elimina el JWT compartido por
     * usuarios y administradores.
     */
    limpiarSesion()

    /*
     * limpiarUsuario elimina los datos personales
     * y también cualquier sesión simulada.
     */
    limpiarUsuario()

    /*
     * Con el login unificado todos los portales
     * regresan al mismo punto de acceso.
     */
    navigate(RUTA_LOGIN, {
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
        'Deberás iniciar sesión nuevamente.',
      textoConfirmar: 'Confirmar',
      alConfirmar: cerrarSesion,
    })
  }

  return {
    solicitarCierreSesion,
  }
}