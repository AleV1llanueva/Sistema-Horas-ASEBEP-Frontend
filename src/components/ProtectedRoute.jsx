import { Navigate, useLocation } from 'react-router'
import { useUsuario } from '../hooks/useUsuario.js'

// Protege las paginas que necesitan una sesion valida.
function ProtectedRoute({
    children,
    rolesPermitidos = [],
 }) {
    const location = useLocation()

    /*
    * autenticado indica si existe un JWT valido.
    * sesionComprobada evita redirigir antes de que
    * UsuarioProvider revise sessionStorage.
    */
   const {
    autenticado,
    rol,
    sesionComprobada,
   } = useUsuario()

   // Mientras no se comprueba la sesion, no mostramos la pagina protegida
   if (!sesionComprobada) {
    return null
   }

   // Si no existe una sesion valida, enviamos al usuario al login.
   if (!autenticado) {
    return (
        <Navigate to="/login" replace state={{
            desde:
                location.pathname + location.search,
            }}
        />
    )
   }

   /*
   * Esta validacion controla la navegacion del frotend.
   */
  const rolPermitido = rolesPermitidos.length === 0 || rolesPermitidos.includes(rol)

  if (!rolPermitido) {
    return (
        <Navigate to="/" replace state={{accesoDenegado: true,
        }}
        />
    )
  }

   return children
}

export default ProtectedRoute