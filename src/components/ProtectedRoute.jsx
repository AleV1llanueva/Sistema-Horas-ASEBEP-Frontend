import {
  useEffect,
  useState,
} from 'react'
import {
  Navigate,
  useLocation,
} from 'react-router'

import {
  normalizarRol,
  obtenerRutaInicialPorRol,
} from '../config/rutasPorRol.js'
import { useUsuario } from '../hooks/useUsuario.js'
import {
  notificarInformacion,
} from '../services/notificationService.js'

const ID_NOTIFICACION_ACCESO = 'acceso-administrativo-denegado'
const MENSAJE_ACCESO_DENEGADO = 'No tienes permisos para entrar en esa area administrativa. '

/*
* Muestra el aviso antes de redirigir al usuario.
*
* El identificador evita notificaciones duplicadas
* cuando React utiliza StrictMode en desarrollo.
*/
function RedireccionAccesoDenegado({
  rutaDestino,
  rutaSolicitada,
}) {
  const [
    notificacionMostrada,
    setNotificacionMostrada,
  ] = useState(false)

  useEffect(() => {
    notificarInformacion({
      id: ID_NOTIFICACION_ACCESO,
      titulo: 'Acceso restringido',
      descripcion: MENSAJE_ACCESO_DENEGADO,
    })

    setNotificacionMostrada(true)
  }, [])

  // Esperamos a que el efecto muestre el mensaje antes de cambiar hacia la ruta autorizada.
  if (!notificacionMostrada) {
    return null
  }

  return (
    <Navigate to={rutaDestino} replace state={{
      motivo: 'acceso-denegado',
      desde: rutaSolicitada,
    }}
    />
  )
}

/*
* Protege cualquier ruta que requiera autenticacion
* rolesPermitidos contiene los roles autorizados para la
* sección protegida. Si esta vacio, cualquier sesion reconocida puede entrar.
*/
function ProtectedRoute({
  children,
  rolesPermitidos = [],
}) {
  const location = useLocation()

  const {
    autenticado,
    rol,
    sesionComprobada,
  } = useUsuario()

  // Evita redirecciones prematuras mientras el provider comprueba la sesion almacenada.
  if (!sesionComprobada) {
    return null
  }

  const rutaSolicitada =
    location.pathname +
    location.search +
    location.hash

  // Si no existe una sesion valida, conservamos la ruta solicitada y enviamos al usuario al login.
  if (!autenticado) {
    return (
      <Navigate to="/login" replace state={{
        motivo: 'sesion-requerida',
        desde: rutaSolicitada,
      }}
      />
    )
  }

  const rolNormalizado = normalizarRol(rol)

  const rolesNormalizados = rolesPermitidos.map(
    normalizarRol,
  )

  const rolPermitido =
    rolesNormalizados.length === 0 || rolesNormalizados.includes(
      rolNormalizado,
    )

  if (!rolPermitido) {
    // La ruta propia siempre se calcula desde el rol real incluido dentro del JWT.
    const rutaPropia =
      obtenerRutaInicialPorRol(
        rolNormalizado,
      )

    /*
    * Un rol desconocido no posee un dashboard seguro.
    * En ese caso lo devolvemos al login.
    */
    if (!rutaPropia) {
      return (
        <Navigate to="/login" replace state={{
          motivo: 'rol-no-reconocido',
          desde: rutaSolicitada,
        }}
        />
      )
    }

    return (
      <RedireccionAccesoDenegado
        rutaDestino={rutaPropia}
        rutaSolicitada={rutaSolicitada}
      />
    )
  }

  return children
}
export default ProtectedRoute
